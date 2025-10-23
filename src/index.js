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
    // Buscar usuario admin en Supabase por email
     let user = await loginAdmin(email);

    if (!user) {
      user = await loginEmpleado(email);
    }

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
      { id: user.Id, email: user.Email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    //res.json({ token });
    res.json({ token, user: {  role: user.role, name: user.Name } });
  } catch (err) {
    res.status(500).json({ message: "Error en el servidor", error: err.message });
  }
});




async function loginAdmin(email) {
  const { data, error } = await supabase
    .from("Admin")
    .select("*")
    .eq("Email", email)
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    return { ...data[0], role: "admin" };
  }

  return null;
}

async function loginEmpleado(email) {
  const { data, error } = await supabase
    .from("Empleado")
    .select("*")
    .eq("Email", email)
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    return { ...data[0], role: data.Role };
  }

  return null;
}




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

app.get("/taller", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {

    let talleres;

    
      const { data, error } = await supabase
        .from("Taller")
        .select("*")
        .eq("Id_Admin", userId); 

      if (error) throw error;
      talleres = data;
    

    res.json({ talleres });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});

app.post("/taller", verifyToken, async (req, res) => {
  const userId = req.user.id; // Id_Admin sacado del token
  const Name = req.body.Name;  // nombre del taller desde el body

  if (!Name) {
    console.log(Name)
    return res.status(400).json({ error: "Falta el campo 'Name'" });
  }

  try {
    const { data, error } = await supabase
      .from("Taller")
      .insert([
        {
          Name: Name,
          Id_Admin: userId,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: "Taller creado correctamente", taller: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});

app.delete("/taller/:id", verifyToken, async (req, res) => {
  const tallerId = req.params.id;

  try {
    

    const { error: deleteError } = await supabase
      .from("Taller")
      .delete()
      .eq("Id", tallerId);

    if (deleteError) throw deleteError;

    res.json({ message: "Taller eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el taller", detail: err.message });
  }
});


app.get("/empleados", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {

    let talleres;
    let empleados;
    
      const { data, error } = await supabase
        .from("Taller")
        .select("*")
        .eq("Id_Admin", userId); 

      if (error) throw error;
      talleres = data;      


      for (let Taller of talleres){
        const { data, error } = await supabase
        .from("Empleado")
        .select("*")
        .eq("Id_Taller", Taller.Id); 

        if (error) throw error;
        empleados= data
      }

      
    

    res.json({ empleados });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.post("/empleados", async (req, res) => {
  try {
    const { Name, Email, Password, Role, Id_Taller, DNI  } = req.body;


    // Validar parámetros
    if (!Name || !Email || !Password || !Role || !Id_Taller || !DNI ) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    // Insertar en Supabase
    const { data, error } = await supabase
      .from("Empleado")
      .insert([
        {
          Name: Name,
          Email: Email,
          Password: Password, 
          Role: Role,
          Id_Taller: Id_Taller,
          DNI: DNI
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


app.delete("/empleados/:id", verifyToken, async (req, res) => {
  const empleadoId = req.params.id;

  try {
    

    const { error: deleteError } = await supabase
      .from("Empleado")
      .delete()
      .eq("Id", empleadoId);

    if (deleteError) throw deleteError;

    res.json({ message: "Empleado eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el taller", detail: err.message });
  }
});

app.put("/empleados/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Email, Password, Role, Id_Taller, DNI } = req.body;

    // Validar que se envíe un ID
    if (!id) {
      return res.status(400).json({ error: "Falta el parámetro ID del empleado" });
    }

    // Validar parámetros requeridos (puedes ajustar según si todos son obligatorios o no)
    if (!Name || !Email || !Role || !Id_Taller || !DNI) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    // Crear el objeto de actualización (solo los campos enviados)
    const updateData = { Name, Email, Role, Id_Taller, DNI };
    if (Password) updateData.Password = Password; // Solo actualiza si se envía

    // Actualizar en Supabase
    const { data, error } = await supabase
      .from("Empleado")
      .update(updateData)
      .eq("Id", id)
      .select();

    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    res.status(200).json({
      message: "Empleado actualizado correctamente",
      empleado: data[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});



app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
