const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Habit = require("./models/Habit");
const cron = require("node-cron");
const { sendReminders } = require("./utils/reminders");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/habitTracker", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// API Endpoints

// Add a new habit
app.post("/habits", async (req, res) => {
  const { name, dailyGoal } = req.body;
  try {
    const habit = new Habit({ name, dailyGoal });
    await habit.save();
    res.status(201).json({ message: "Habit added successfully", habit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark a habit as complete
app.put("/habits/:id", async (req, res) => {
  const { id } = req.params;
  const { date } = req.body;
  try {
    const habit = await Habit.findById(id);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const completionDate = date || new Date().toISOString().split("T")[0];
    habit.completionDates.push(completionDate);
    await habit.save();
    res.status(200).json({ message: "Habit marked as complete", habit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all habits
app.get("/habits", async (req, res) => {
  try {
    const habits = await Habit.find();
    res.status(200).json(habits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weekly report
app.get("/habits/report", async (req, res) => {
  try {
    const habits = await Habit.find();
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const report = habits.map((habit) => {
      const completionCount = habit.completionDates.filter(
        (date) => new Date(date) >= lastWeek && new Date(date) <= today
      ).length;

      return {
        name: habit.name,
        dailyGoal: habit.dailyGoal,
        completedDays: completionCount,
      };
    });

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Set up daily reminders
cron.schedule("0 9 * * *", sendReminders); // Sends reminders at 9:00 AM daily
