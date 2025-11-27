const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const cors = require('cors');
require("dotenv").config();

const app = express();
app.use(express.json());

const corsOptions = {
  origin: "http://localhost:4200",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));


app.get("/test", (req, res) => {
  res.json({ ok: "test" });
});


app.get("/", (req, res) => {
  res.json({ ok: "Inicio" });
});

app.listen(3000, ()=>{
  console.log("okk")
});