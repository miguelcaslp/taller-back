const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const cors = require('cors');
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());


// Clave secreta para firmar el JWT (idealmente poner en .env)
const SECRET_KEY = process.env.SECRET_KEY;

// Conectar con Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Endpoint de login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar usuario en Supabase por email
    const { data: users, error } = await supabase
      .from("Admin")
      .select("*")
      .eq("Email", email)
      .limit(1);

    if (error) throw error;
    
    const user = users[0];
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }
    
    

    // Validar contraseña
    const validPassword = bcrypt.compareSync(password, user.Password);
    if (!validPassword) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

   

    // Crear token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Error en el servidor", error: err.message });
  }
});

// Middleware para verificar token
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // formato "Bearer <token>"

  if (!token) return res.status(403).json({ message: "Token requerido" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Token inválido" });
    req.user = user; // guardar datos del usuario en request
    next();
  });
}

// Ejemplo de endpoint protegido
app.get("/perfil", verifyToken, (req, res) => {
  res.json({
    message: "Bienvenido a tu perfil",
    user: req.user
  });
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validar parámetros
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    // Insertar en Supabase
    const { data, error } = await supabase
      .from("Admin")
      .insert([
        {
          Name: name,
          Email: email,
          Password: password, 
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: "Usuario creado correctamente", user: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});



app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
