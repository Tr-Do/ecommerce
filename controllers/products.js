const Design = require("../models/design");
const { throwError } = require("../utils/AppError");
const cloudinary = require("../cloudinary");
const { uploadToS3 } = require("../utils/s3Upload");
const { deleteFromS3 } = require("../utils/s3Delete");
const Variant = require("../models/variant");

const mkS3Files = async (files, prefix) => {
  return Promise.all(
    (files || []).map(async (file) => {
      const { bucket, key } = await uploadToS3({
        buffer: file.buffer,
        contentType: file.mimetype,
        originalName: file.originalname,
        prefix,
      });
      return {
        bucket,
        key,
        originalName: file.originalname,
        contentType: file.mimetype,
        size: file.size,
      };
    }),
  );
};

module.exports.index = async (req, res, next) => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const pageRaw = Number(req.query.page);
    const currentPage = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const view = req.query.view === "all" ? "all" : "paged";
    const filter = search ? { name: { $regex: search, $options: "i" } } : {};

    let products, total, totalPages;

    if (view === "all") {
      products = await Design.aggregate([
        { $match: filter },
        {
          $addFields: {
            projectNumber: {
              $toInt: {
                $arrayElemAt: [{ $split: ["$name", " "] }, 1],
              },
            },
          },
        },
        { $sort: { projectNumber: 1 } },
      ]);
      total = products.length;
      totalPages = 1;
    } else {
      const limit = 8;
      const skip = (currentPage - 1) * limit;

      [products, total] = await Promise.all([
        Design.aggregate([
          { $match: filter },
          {
            $addFields: {
              projectNumber: {
                $toInt: {
                  $arrayElemAt: [{ $split: ["$name", " "] }, 1],
                },
              },
            },
          },
          { $sort: { projectNumber: 1 } },
          { $skip: skip },
          { $limit: limit },
        ]),
        Design.countDocuments(filter),
      ]);

      totalPages = Math.max(Math.ceil(total / limit), 1);
    }

    res.render("index", {
      bodyClass: "products-bg",
      products,
      currentPage,
      totalPages,
      view,
      search,
    });
  } catch (err) {
    next(err);
  }
};

module.exports.renderNewForm = (req, res) => {
  res.render("products/new");
};

module.exports.createProduct = async (req, res, next) => {
  try {
    const product = new Design(req.body.product);

    // upload images to cloudinary
    const imageUploads = req.imageFiles || [];
    const cloudinaryImages = await Promise.all(
      imageUploads.map(
        (file) =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "product", resource_type: "auto" },
              (error, result) => (error ? reject(error) : resolve(result)),
            );
            stream.end(file.buffer);
          }),
      ),
    );

    product.images = cloudinaryImages.map((f) => ({
      url: f.secure_url || f.url,
      filename: f.public_id,
      type: f.resource_type,
      format: f.format,
    }));

    // Arrange image order
    let order = req.body.product?.imageOrder; // after your split() this is an array
    if (typeof order === "string") order = order.split(",").filter(Boolean);
    if (Array.isArray(order) && order.length) {
      const byFilename = new Map(
        product.images.map((img) => [img.filename, img]),
      );
      const ordered = order.map((fn) => byFilename.get(fn)).filter(Boolean);
      const orderedSet = new Set(order);
      const remaining = product.images.filter(
        (img) => !orderedSet.has(img.filename),
      );

      product.images = [...ordered, ...remaining];
    }

    const prefix = `products/${product._id}`;

    const sizesRaw = req.body.product?.size;
    const sizes = Array.isArray(sizesRaw)
      ? sizesRaw
      : sizesRaw
        ? [sizesRaw]
        : ["Standard"];

    const hasStandard = sizes.includes("Standard");
    const nonStandardSizes = sizes.filter((s) => s !== "Standard");

    if (!sizes.length) throw new Error("Select at least one size");
    if (hasStandard && nonStandardSizes.length > 0) {
      throw new Error("Do not mix standard size with others");
    }

    let variantDocs = [];

    if (hasStandard) {
      const standardFiles = await mkS3Files(
        req.designFilesByField?.designFileStandard,
        prefix,
      );

      if (!standardFiles.length)
        throw new Error("Standard variant files are required");

      variantDocs = [
        {
          productId: product._id,
          size: "Standard",
          price: product.price,
          files: standardFiles,
        },
      ];
    } else {
      variantDocs = await Promise.all(
        nonStandardSizes.map(async (size) => {
          const fieldName = `designFile${size}`;
          const files = await mkS3Files(
            req.designFilesByField?.[fieldName],
            prefix,
          );

          if (!files.length)
            throw new Error(`Missing upload files for ${size}`);

          return {
            productId: product._id,
            size,
            price: product.price,
            files,
          };
        }),
      );
    }

    await product.save();
    await Variant.insertMany(variantDocs);

    req.flash("success", "Add product sucessfully");
    res.redirect(`/products/${product._id}`);
  } catch (err) {
    next(err);
  }
};

module.exports.showProduct = async (req, res) => {
  const product = await Design.findById(req.params.id).populate({
    path: "reviews",
    populate: { path: "author" },
  });

  const usernames = product.reviews
    .map((review) => review.author?.username)
    .filter(Boolean);

  const variants = await Variant.find({ productId: product._id }).lean();

  res.render("products/show", { product, usernames, variants });
};

module.exports.editForm = async (req, res) => {
  const { id } = req.params;
  const product = await Design.findById(req.params.id);
  const variants = await Variant.find({ productId: id }).lean();
  throwError(product);
  res.render("products/edit", { product, variants });
};

module.exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (
      req.body.product?.imageOrder &&
      typeof req.body.product.imageOrder === "string"
    ) {
      req.body.product.imageOrder = req.body.product.imageOrder
        .split(",")
        .filter(Boolean);
    }

    const product = await Design.findByIdAndUpdate(
      id,
      { ...req.body.product },
      { new: true, runValidators: true },
    );

    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/products");
    }

    const prefix = `products/${product._id}`;

    const standardFiles = await mkS3Files(
      req.designFilesByField?.designFileStandard,
      prefix,
    );
    if (standardFiles.length) {
      let price;
      if (
        req.body.product &&
        req.body.product.price !== undefined &&
        req.body.product.price !== null
      ) {
        price = req.body.product.price;
      } else price = product.price;

      await Variant.findOneAndUpdate(
        {
          productId: product._id,
          size: "Standard",
        },
        {
          $set: {
            productId: product._id,
            size: "Standard",
            price,
            files: standardFiles,
          },
        },
        { upsert: true, new: true },
      );
    }

    const sizesRaw = req.body.product?.size;
    // if no box is checked, default is Standard
    const sizes = Array.isArray(sizesRaw)
      ? sizesRaw
      : sizesRaw
        ? [sizesRaw]
        : ["Standard"];

    const hasStandard = sizes.includes("Standard");
    const nonStandardSizes = sizes.filter((s) => s !== "Standard");

    if (hasStandard && nonStandardSizes.length > 0)
      throw new Error("Do not mix standard size with others");

    for (const size of sizes) {
      if (size === "Standard") continue;
      const fieldName = `designFile${size}`;
      const uploaded = await mkS3Files(
        req.designFilesByField?.[fieldName],
        prefix,
      );

      if (!uploaded.length) continue;

      let price;
      if (
        req.body.product &&
        req.body.product.price !== undefined &&
        req.body.product.price !== null
      ) {
        price = req.body.product.price;
      } else price = product.price;

      await Variant.findOneAndUpdate(
        {
          productId: product._id,
          size,
        },
        {
          $set: {
            productId: product._id,
            size,
            price,
            files: uploaded,
          },
        },
        { upsert: true, new: true },
      );
    }

    // image upload logic
    const imageUploads = req.imageFiles || [];
    const cloudinaryImages = [];
    for (const file of imageUploads) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "product", resource_type: "auto" },
          (error, result) => (error ? reject(error) : resolve(result)),
        );
        stream.end(file.buffer);
      });
      cloudinaryImages.push(result);
    }

    const imgs = cloudinaryImages.map((f) => {
      const url = f.secure_url || f.url;
      const filename = f.public_id;
      const type = f.resource_type;
      const format = f.format;
      if (!url) throw new Error("No url found");
      return { url, filename, type, format };
    });
    product.images.push(...imgs);

    // delete images in deleteImage array
    let deleteImages = [];
    if (req.body.deleteImages) {
      if (Array.isArray(req.body.deleteImages)) {
        deleteImages = req.body.deleteImages;
      } else {
        deleteImages = [req.body.deleteImages];
      }
    }
    for (const filename of deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }

    // loop through product[image] array because it hasn't been saved
    const keptImages = [];
    for (let i = 0; i < product.images.length; i++) {
      const img = product.images[i];
      if (!deleteImages.includes(img.filename)) keptImages.push(img);
    }

    product.images = keptImages;

    // arrange image order
    const order = req.body.product?.imageOrder; // after your split() this is an array
    if (Array.isArray(order) && order.length) {
      const byFilename = new Map(
        product.images.map((img) => [img.filename, img]),
      );

      const ordered = order.map((fn) => byFilename.get(fn)).filter(Boolean);

      // Append any remaining images not listed in order (e.g., newly uploaded ones)
      const orderedSet = new Set(order);
      const remaining = product.images.filter(
        (img) => !orderedSet.has(img.filename),
      );

      product.images = [...ordered, ...remaining];
    }

    await product.save();

    req.flash("success", "Update product sucessfully");
    res.redirect(`/products/${product._id}`);
  } catch (err) {
    next(err);
  }
};

module.exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Design.findById(id);
    throwError(product);

    for (const media of product.images || []) {
      if (media.filename) {
        await cloudinary.uploader.destroy(media.filename, {
          resource_type: media.type === "video" ? "video" : "image",
        });
      }
    }
    const variants = await Variant.find({ productId: id });

    for (const variant of variants) {
      for (const file of variant.files || []) {
        await deleteFromS3({
          bucket: file.bucket,
          key: file.key,
        });
      }
    }
    await Variant.deleteMany({ productId: id });
    await Design.findByIdAndDelete(id);

    req.flash("success", "Delete product sucessfully");
    res.redirect("/products");
  } catch (err) {
    next(err);
  }
};
