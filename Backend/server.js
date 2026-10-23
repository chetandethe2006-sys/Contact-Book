const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "";

app.use(cors());
app.use(express.json());

// Mongoose Schema & Model
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
});

contactSchema.set("toJSON", {
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

const Contact = mongoose.model("Contact", contactSchema);

// In-memory sample data fallback if MongoDB URI is not set or server is offline
let isMongoConnected = false;
let inMemoryContacts = [
    { id: 1, name: "Aditi", phone: "98765 43210", email: "aditi@example.com" },
    { id: 2, name: "Rohan Mehta", phone: "91234 56789", email: "rohan@example.com" },
    { id: 3, name: "Suresh Patil", phone: "98123 45678", email: "suresh@example.com" },
];

// API 1: Get all contacts
app.get("/api/contacts", async (req, res) => {
    try {
        if (isMongoConnected) {
            const contacts = await Contact.find();
            return res.json(contacts);
        }
        res.json(inMemoryContacts);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch contacts", message: error.message });
    }
});

// API 2: Get single contact by id
app.get("/api/contacts/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (isMongoConnected) {
            const contact = await Contact.findById(id);
            if (!contact) return res.status(404).json({ error: "Contact not found" });
            return res.json(contact);
        }
        const contact = inMemoryContacts.find((c) => String(c.id) === String(id));
        if (!contact) return res.status(404).json({ error: "Contact not found" });
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch contact", message: error.message });
    }
});

// API 3: Create a new contact
app.post("/api/contacts", async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const trimmedContact = {
            name: name.trim(),
            phone: phone ? phone.trim() : "",
            email: email ? email.trim() : ""
        };

        if (isMongoConnected) {
            const newContact = await Contact.create(trimmedContact);
            return res.status(201).json(newContact);
        }

        const newContact = {
            id: Date.now(),
            ...trimmedContact
        };
        inMemoryContacts.push(newContact);
        res.status(201).json(newContact);
    } catch (error) {
        res.status(500).json({ error: "Failed to create contact", message: error.message });
    }
});

// API 4: Update contact by id
app.put("/api/contacts/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { name, phone, email } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const updatedData = {
            name: name.trim(),
            phone: phone ? phone.trim() : "",
            email: email ? email.trim() : ""
        };

        if (isMongoConnected) {
            const updated = await Contact.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
            if (!updated) return res.status(404).json({ error: "Contact not found" });
            return res.json(updated);
        }

        const index = inMemoryContacts.findIndex((c) => String(c.id) === String(id));
        if (index === -1) return res.status(404).json({ error: "Contact not found" });

        inMemoryContacts[index] = {
            ...inMemoryContacts[index],
            ...updatedData
        };
        res.json(inMemoryContacts[index]);
    } catch (error) {
        res.status(500).json({ error: "Failed to update contact", message: error.message });
    }
});

// API 5: Delete contact by id
app.delete("/api/contacts/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (isMongoConnected) {
            const deleted = await Contact.findByIdAndDelete(id);
            if (!deleted) return res.status(404).json({ error: "Contact not found" });
            return res.json({ message: "Contact deleted", id });
        }

        const index = inMemoryContacts.findIndex((c) => String(c.id) === String(id));
        if (index === -1) return res.status(404).json({ error: "Contact not found" });
        inMemoryContacts.splice(index, 1);
        res.json({ message: "Contact deleted", id });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete contact", message: error.message });
    }
});

function startServer() {
    const server = app.listen(PORT, () => {
        console.log(`\n==================================================`);
        console.log(` Contact Book API running on http://localhost:${PORT}`);
        if (isMongoConnected) {
            console.log(` Storage Mode: MongoDB Connected`);
        } else {
            console.log(` Storage Mode: In-Memory Fallback (Active)`);
            console.log(` To connect MongoDB: set MONGODB_URI in server.js or .env`);
        }
        console.log(`==================================================\n`);
    });

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.error(`\n❌ ERROR: Port ${PORT} is already in use by another program or terminal!`);
            console.error(`👉 Close any other running terminal with 'node' or 'nodemon', or change PORT in .env\n`);
        } else {
            console.error("\n❌ Server error:", error.message, "\n");
        }
    });
}

// Connect to MongoDB or start with fallback
if (MONGODB_URI && MONGODB_URI.trim()) {
    mongoose
        .connect(MONGODB_URI)
        .then(() => {
            isMongoConnected = true;
            console.log("Connected to MongoDB successfully");
            startServer();
        })
        .catch((error) => {
            console.warn("Could not connect to MongoDB:", error.message);
            console.warn("Starting with in-memory storage fallback...");
            startServer();
        });
} else {
    console.log("No MONGODB_URI provided. Starting server with in-memory storage.");
    startServer();
}
