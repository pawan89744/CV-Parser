require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bodyParser = require('body-parser');
const fs = require('fs');

const path = require("path");
const textract = require("textract"); // Library to extract text from various file formats

const app = express();
app.use(bodyParser.json());

/**
 * Extract CV information from text
 * @param {string} fileUrl - URL of the uploaded CV file
 * @returns {Promise<object>} - Parsed CV details
 */


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cv_uploads', // Folder in Cloudinary to store CVs
    allowed_formats: ['pdf', 'doc', 'docx', 'rtf', 'txt'],
  },
});
const upload = multer({ storage: storage });

// CV Parsing Function (Mock Implementation)
// const parseCV = (fileUrl) => {
  //   // Placeholder for actual CV parsing logic.
  //   // You can integrate third-party libraries or APIs like resume-parser.
  //   return {
    //     name: "John Doe",
    //     skills: ["JavaScript", "Node.js"],
    //     experience: "2 years",
    //     education: "Bachelor's in Computer Science",
    //   };
    // };
    
    // Routes
    const parseCV = async (fileUrl) => {
      try {
        // Extract text from the file using textract
        const extractedText = await new Promise((resolve, reject) => {
          textract.fromUrl(fileUrl, (error, text) => {
            if (error) reject(error);
            else resolve(text);
          });
        });
        console.log("extracted text: ", extractedText);
        // Split text into lines
        const lines = extractedText.split("\n").map((line) => line.trim());
    
        // Extract Name (Assuming the first non-empty line is the name)
        const name = lines.find((line) => line.match(/^[a-zA-Z\s]+$/)) || "Not found";
    
        // Extract Email
        const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
        const email = lines.find((line) => emailRegex.test(line)) || "Not found";
    
        // Extract Phone Number
        const phoneRegex = /\+?\d{1,4}?[-.\s]?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
        const phone = lines.find((line) => phoneRegex.test(line)) || "Not found";
    
        // Extract Experience (Lines following "Experience")
        const experience = [];
        let experienceFlag = false;
        lines.forEach((line) => {
          if (line.toLowerCase().includes("experience")) experienceFlag = true;
          else if (experienceFlag && line === "") experienceFlag = false;
          else if (experienceFlag) experience.push(line);
        });
    
        // Extract Skills (Lines following "Skills" or "Technical Skills")
        const skills = [];
        let skillsFlag = false;
        lines.forEach((line) => {
          if (line.toLowerCase().includes("skills")) skillsFlag = true;
          else if (skillsFlag && line === "") skillsFlag = false;
          else if (skillsFlag) skills.push(line);
        });
    
        return {
          name,
          email,
          phone,
          experience: experience.join(" "),
          skills: skills.join(" "),
        };
      } catch (error) {
        console.error("Error parsing CV:", error);
        return { error: "Failed to parse CV. Please upload a valid file." };
      }
    };
// Upload CV
// app.post('/upload', upload.single('cv'), (req, res) => {
//   if (!req.file) {
  //     return res.status(400).json({ error: 'No file uploaded' });
  //   }
  
//   const fileUrl = req.file.path; // Cloudinary URL of the uploaded file
//   const parsedData = parseCV(fileUrl);

//   res.json({
  //     message: 'CV uploaded successfully',
  //     fileUrl: fileUrl,
//     parsedData: parsedData,
//   });
// });

app.post('/upload', upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = req.file.path; // Cloudinary URL of the uploaded file


  try {
    // Parse CV dynamically
    const parsedData = await parseCV(fileUrl);
    console.log("parsedData: ", parsedData);
    res.json({
      message: 'CV uploaded successfully',
      fileUrl: fileUrl,
      parsedData: parsedData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse CV', details: error.message });
  }
});



// Preview CV
app.get('/preview/:fileUrl', (req, res) => {
  const fileUrl = req.params.fileUrl;
  res.redirect(fileUrl); // Redirect to Cloudinary-hosted file
});

// Replace/Update CV
app.post('/replace', upload.single('cv'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = req.file.path;
  const parsedData = parseCV(fileUrl);

  res.json({
    message: 'CV updated successfully',
    fileUrl: fileUrl,
    parsedData: parsedData,
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
