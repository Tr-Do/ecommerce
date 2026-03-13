const mediaBtn = document.getElementById("media");
const mediaBody = document.getElementById("mediaBody");
const reviewBtn = document.getElementById("review");
const reviewBody = document.getElementById("reviewBody");

mediaBtn.addEventListener("click", (e) => {
  e.preventDefault();
  reviewBody.classList.add("d-none");
  mediaBody.classList.remove("d-none");
});

reviewBtn.addEventListener("click", (e) => {
  e.preventDefault();
  reviewBody.classList.remove("d-none");
  mediaBody.classList.add("d-none");
});
