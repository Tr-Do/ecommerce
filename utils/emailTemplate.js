function buildDownloadEmail({ orderNumber, files }) {
    const rows = files.map(f => `
        <li style="list-style:none; margin-bottom:12px;">
            <strong>${f.name}</strong><br>
            <a href="${f.url}">Download</a>
        </li>
    `).join('');

    return `
<table width="100%" cellpadding="0" cellspacing="0"
       style="
         background-image:url('https://res.cloudinary.com/dky8szloh/image/upload/v1769301746/8d70b640-4d5a-4a9b-8595-43f2d0f76103_c3nwab.png');
         background-size:cover;
         background-position:center;
         background-repeat:no-repeat;
         background-color:#111;
       ">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background-color:rgba(0,0,0,0.75); padding:24px;">
        <tr>
          <td style="color:#ffffff; font-family:Arial,sans-serif;">
            <h2 style="text-align:center;">Thank you for your purchase</h2>
            <p style="text-align:center;">Order ID: <strong>${orderNumber}</strong></p>
            <p style="text-align:center;">Your download link(s) will expire in 12 hours!</p>\
            <ul style="text-align:center; padding:0; margin:24px 0;">
              ${rows}
            </ul>
            <p style="text-align:center;">Feel fre to contact us if you have any questions</p>
            <p style="text-align:center;">
              <a href="mailto:terrarium@primewaytrading.net" style="color:#9ad;">
                terrarium@primewaytrading.net
              </a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;
}

module.exports = { buildDownloadEmail };
