const fs = require("fs");
const path = require("path");

/**
 * Delete file from server
 * @param {string} filePath - path of file to delete
 */
const deleteFile = (filePath) => {
  try {
    if (!filePath) return;

    // absolute path build
    const fullPath = path.join(
      __dirname,
      "..",
      filePath
    );

    // check if file exists
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("File deleted:", fullPath);
    } else {
      console.log("File not found:", fullPath);
    }
  } catch (error) {
    console.error("File delete error:", error.message);
  }
};

module.exports = {
  deleteFile,
};