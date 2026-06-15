const mongoose = require('mongoose');

// 🔗 Mongo URI
mongoose.connect('mongodb+srv://zohaibasif477_db_user:h2dR2SG0wBrGvp29@cluster0.0njzl4f.mongodb.net/tournamentDB?retryWrites=true&w=majority')
  .then(async () => {
    console.log("MongoDB Connected");

    try {
      console.log("⚠️ WIPING DATABASE...");

      const db = mongoose.connection.db;

      const collections = await db.collections();

      for (let collection of collections) {
        await collection.deleteMany({});
        console.log(`🧹 Cleared: ${collection.collectionName}`);
      }

      console.log("✅ DATABASE FULLY RESET SUCCESSFULLY");

    } catch (error) {
      console.log("❌ ERROR:", error);
    }

    mongoose.connection.close();

  })
  .catch(err => {
    console.log("❌ CONNECTION ERROR:", err);
  });