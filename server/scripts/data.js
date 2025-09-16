// Create a file: scripts/migrate-player-index.js

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function migratePlayerIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/your_database"
    );
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("players");

    // Check if old index exists
    const indexes = await collection.indexes();
    const oldIndexExists = indexes.some(
      (index) => index.name === "name_1_admin_1"
    );

    if (oldIndexExists) {
      console.log("Dropping old index: name_1_admin_1");
      await collection.dropIndex("name_1_admin_1");
      console.log("Old index dropped successfully");
    } else {
      console.log("Old index not found, skipping drop");
    }

    // Create new unique index on name only
    console.log("Creating new unique index on name");
    await collection.createIndex({ name: 1 }, { unique: true });
    console.log("New index created successfully");

    // Verify the new indexes
    const newIndexes = await collection.indexes();
    console.log("Current indexes:");
    newIndexes.forEach((index) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);

    if (error.code === 11000) {
      console.log("\n⚠️  DUPLICATE PLAYERS DETECTED!");
      console.log(
        "You have players with duplicate names. Please clean up duplicates first:"
      );
      console.log(
        '1. Find duplicates: db.players.aggregate([{$group:{_id:"$name",count:{$sum:1}}},{$match:{count:{$gt:1}}}])'
      );
      console.log("2. Remove duplicates manually");
      console.log("3. Run this migration again");
    }
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Run the migration
migratePlayerIndex();
