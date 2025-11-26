/*const express = require("express");
const serverless = require("serverless-http");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const cors = require('cors');
require("dotenv").config();

const app = express();
app.use(express.json());

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
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
      { id: user.Id, email: user.Email, role: user.role },
      SECRET_KEY,
      { expiresIn: "6h" }
    );

    if (user.role == "Admin") {
      res.json({ token, user: { role: user.role, name: user.Name } });
    } else {
      res.json({ token, user: { role: user.role, name: user.Name, Id_Taller: user.Id_Taller } });
    }
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
    return { ...data[0], role: "Admin" };
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
    return { ...data[0], role: data[0].Role };

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

app.put("/taller/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const { Name } = req.body;

  if (!Name) {
    return res.status(400).json({ error: "Falta algun campo" });
  }

  try {
    const { data, error } = await supabase
      .from("Taller")
      .update([
        {
          Name: Name
        },
      ])
      .eq("Id", id)
      .select();

    if (error) throw error;

    res.status(201).json({ message: "Taller modificado correctamente", taller: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});



app.get("/empleados", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {

    let talleres;
    let empleados = [];

    const { data, error } = await supabase
      .from("Taller")
      .select("*")
      .eq("Id_Admin", userId);

    if (error) throw error;
    talleres = data;


    for (let Taller of talleres) {
      const { data, error } = await supabase
        .from("Empleado")
        .select("*")
        .eq("Id_Taller", Taller.Id);

      if (error) throw error;
      empleados.push(...data)
    }


    res.json({ empleados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});

app.get("/mecanicos/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  try {

    let mecanicos = [];

    const { data, error } = await supabase
      .from("Empleado")
      .select("*")
      .eq("Id_Taller", id)
      .eq("Role", "Mecanico");

    if (error) throw error;
    mecanicos = data


    res.json({ mecanicos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.post("/empleados", verifyToken, async (req, res) => {
  try {
    const { Name, Email, Password, Role, Id_Taller, DNI } = req.body;


    // Validar parámetros
    if (!Name || !Email || !Password || !Role || !Id_Taller || !DNI) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    // Insertar en Supabase
    const { data, error } = await supabase
      .from("Empleado")
      .insert([
        {
          Name: Name,
          Email: Email,
          Password: hashedPassword,
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

app.put("/empleados/:id", verifyToken, async (req, res) => {
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
    if (Password) updateData.Password = await bcrypt.hash(Password, 10);  // Solo actualiza si se envía

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


app.get("/clientes/:id", verifyToken, async (req, res) => {
  let clientes = [];
  const { id } = req.params;
  try {

    const { data: Taller_Cliente, error } = await supabase
      .from("Taller_Cliente")
      .select("*")
      .eq("Id_Taller", id);


    if (error) throw error;


    for (let Cliente of Taller_Cliente) {
      const { data, error } = await supabase
        .from("Cliente")
        .select("*")
        .eq("Id", Cliente.Id_Cliente);

      if (error) throw error;
      clientes.push(...data)
    }

    if (error) throw error;

    res.json({ clientes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});



app.post("/clientes", verifyToken, async (req, res) => {
  try {
    const { Name, Email, DNI, Phone, Id_Taller } = req.body;

    // Validar parámetros
    if (!Name || !Email || !DNI || !Phone || !Id_Taller) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    // 1️⃣ Buscar si el cliente ya existe
    const { data: clienteExistente, error: errorBusqueda } = await supabase
      .from("Cliente")
      .select("*")
      .eq("DNI", DNI);

    if (errorBusqueda) throw errorBusqueda;

    if (clienteExistente && clienteExistente.length > 0) {

      const { data: relacion, error: errorRelacion } = await supabase
        .from("Taller_Cliente")
        .insert([
          {
            Id_Taller: Id_Taller,
            Id_Cliente: clienteExistente.Id
          },
        ])
        .select();

      if (errorRelacion) throw errorRelacion;
      return res.status(200).json({ message: "Relacion Creada" });
    }


    // 2️⃣ Crear nuevo cliente
    const { data: nuevoCliente, error: errorInsertCliente } = await supabase
      .from("Cliente")
      .insert([{ Name, Email, DNI, Phone }])
      .select();

    if (errorInsertCliente) throw errorInsertCliente;

    const clienteCreado = nuevoCliente[0];

    // 3️⃣ Asociar cliente con taller
    const { data: relacion, error: errorRelacion } = await supabase
      .from("Taller_Cliente")
      .insert([
        {
          Id_Taller: Id_Taller,
          Id_Cliente: clienteCreado.Id
        },
      ])
      .select();

    if (errorRelacion) throw errorRelacion;

    // 4️⃣ Responder con éxito
    res.status(201).json({
      message: "Cliente creado y asociado correctamente",
      cliente: clienteCreado,
      relacion: relacion[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.put("/clientes", verifyToken, async (req, res) => {
  try {
    const { Id, Name, Email, DNI, Phone } = req.body;

    if (!Id || !Name || !Email || !DNI || !Phone) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    const updateData = { Name, Email, DNI, Phone };

    const { data, error } = await supabase
      .from("Cliente")
      .update(updateData)
      .eq("Id", Id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.status(200).json({
      message: "Cliente modificado correctamente",
      vehiculo: data[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/vehiculos/:id", verifyToken, async (req, res) => {

  let clientes = [];
  let vehiculos = [];
  const { id } = req.params;

  try {

    const { data: Taller_Cliente, error } = await supabase
      .from("Taller_Cliente")
      .select("*")
      .eq("Id_Taller", id);


    if (error) throw error;


    for (let Cliente of Taller_Cliente) {
      const { data, error } = await supabase
        .from("Cliente")
        .select("*")
        .eq("Id", Cliente.Id_Cliente);

      if (error) throw error;
      clientes.push(...data)
    }

    if (error) throw error;



    for (let cliente of clientes) {
      const { data, error } = await supabase
        .from("Vehiculo")
        .select("*")
        .eq("Id_Cliente", cliente.Id);

      if (error) throw error;
      vehiculos.push(...data)
    }

    if (error) throw error;

    res.json({ vehiculos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});



app.post("/vehiculos", verifyToken, async (req, res) => {
  try {
    const { Car_Plate, Model, Maker, Id_Taller, Id_Cliente } = req.body;
    if (!Car_Plate || !Model || !Maker || !Id_Cliente || !Id_Taller) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    const { data: vehiculoExistente, error: error1 } = await supabase
      .from("Vehiculo")
      .select("*")
      .eq("Car_Plate", Car_Plate);

    if (error1) throw error1;

    if (vehiculoExistente && vehiculoExistente.length > 0) {
      return res.status(200).json({ message: "El coche ya esta creado" });
    } else {

      const { data: nuevoVehiculo, error: error2 } = await supabase
        .from("Vehiculo")
        .insert([{ Car_Plate, Model, Maker, Id_Cliente }])
        .select();

      if (error2) throw error2;

      res.status(201).json({
        message: "Vehiculo creado correctamente",
      });
    }


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }

});

app.put("/vehiculos", verifyToken, async (req, res) => {
  try {
    const { Id, Car_Plate, Model, Maker, Id_Cliente } = req.body;

    if (!Id || !Car_Plate || !Model || !Maker || !Id_Cliente) {
      return res.status(400).json({ message: "Faltan parámetros" });
    }

    const updateData = { Car_Plate, Model, Maker, Id_Cliente };

    const { data, error } = await supabase
      .from("Vehiculo")
      .update(updateData)
      .eq("Id", Id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Vehículo no encontrado" });
    }

    // Respuesta exitosa
    res.status(200).json({
      message: "Vehículo modificado correctamente",
      vehiculo: data[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor", detail: err.message });
  }
});



app.get("/reparaciones/:id", verifyToken, async (req, res) => {
  let reparaciones = [];
  const { id } = req.params;
  try {

    const { data: reparacionesRaw, error } = await supabase
      .from("Reparacion")
      .select("*")
      .eq("Id_Taller", id);

    const reparaciones = [];

    for (let rep of reparacionesRaw) {
      const { data: cliente } = await supabase
        .from("Cliente")
        .select("DNI")
        .eq("Id", rep.Id_Cliente)
        .single();



      const { data: vehiculo } = await supabase
        .from("Vehiculo")
        .select("Car_Plate")
        .eq("Id", rep.Id_Vehiculo)
        .single();


      reparaciones.push({
        ...rep,
        DNI: cliente?.DNI || null,
        Car_Plate: vehiculo?.Car_Plate || null
      });

      res.json({ reparaciones });
    }


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.get("/reparacion/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {

    let reparacion;


    const { data, error } = await supabase
      .from("Reparacion")
      .select("*")
      .eq("Id", id)
      .single();

    if (error) throw error;


    res.json({ data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.get("/vehiculo/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {



    const { data, error } = await supabase
      .from("Vehiculo")
      .select("*")
      .eq("Id", id)
      .single();

    if (error) throw error;


    res.json({ data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.post("/reparaciones", verifyToken, async (req, res) => {

  const { Id_Vehiculo, Repair_Request, Id_Cliente, Id_Taller, State, Date } = req.body;

  if (!Id_Vehiculo || !Repair_Request || !Id_Cliente || !Id_Taller || !State || !Date) {
    return res.status(400).json({ error: "Falta algun campo" });
  }

  try {
    const { data, error } = await supabase
      .from("Reparacion")
      .insert([
        {
          Id_Vehiculo: Id_Vehiculo,
          Repair_Request: Repair_Request,
          Id_Cliente: Id_Cliente,
          Id_Taller: Id_Taller,
          State: State,
          Date: Date
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: "Orden de reparación creada correctamente", taller: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});

app.put("/reparaciones", verifyToken, async (req, res) => {
  const { Id, Id_Vehiculo, Repair_Request, Id_Cliente, Id_Taller, State, Date } = req.body;

  if (!Id || !Id_Vehiculo && !Repair_Request && !Id_Cliente && !Id_Taller && !State && !Date) {
    return res.status(400).json({ error: "Debe enviar al menos un campo para actualizar" });
  }

  try {
    const updatedFields = {};
    if (Id_Vehiculo) updatedFields.Id_Vehiculo = Id_Vehiculo;
    if (Repair_Request) updatedFields.Repair_Request = Repair_Request;
    if (Id_Cliente) updatedFields.Id_Cliente = Id_Cliente;
    if (Id_Taller) updatedFields.Id_Taller = Id_Taller;
    if (State) updatedFields.State = State;
    if (Date) updatedFields.Date = Date;

    const { data, error } = await supabase
      .from("Reparacion")
      .update(updatedFields)
      .eq("Id", Id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ error: "Reparación no encontrada" });
    }

    res.status(200).json({ message: "Reparación actualizada correctamente", reparacion: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});

app.delete("/reparacion/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  try {

    const { error: deleteError } = await supabase
      .from("Reparacion")
      .delete()
      .eq("Id", id);

    if (deleteError) throw deleteError;

    res.json({ message: "Reparacion eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar la reparacion", detail: err.message });
  }
});


app.get("/tareas/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {

    // 1. Obtener todas las reparaciones del taller
    const { data: reparaciones, error: reparacionesError } = await supabase
      .from("Reparacion")
      .select("Id")
      .eq("Id_Taller", id);

    if (reparacionesError) throw reparacionesError;

    const reparacionIds = reparaciones.map(r => r.Id);

    if (reparacionIds.length === 0) {
      return res.json({ tasks: [] });
    }

    // 2. Obtener tasks con datos del mecánico y la reparación
    const { data: tasks, error: tasksError } = await supabase
      .from("Task")
      .select(`
        *,
        Empleado:Id_Mecanico (
          Name
        ),
        Reparacion:Id_Reparacion (
          Repair_Request
        )
      `)
      .in("Id_Reparacion", reparacionIds);

    if (tasksError) throw tasksError;

    res.json({ tasks });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.post("/tareas", verifyToken, async (req, res) => {
  try {
    const { Id_Reparacion, Id_Mecanico, Hours, State } = req.body;

    console.log(req.body);

    // Validación: no se envía Id porque lo genera la base de datos
    if (!Id_Reparacion || !Id_Mecanico || Hours == null || !State) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    // Inserta la nueva tarea
    const { data, error } = await supabase
      .from("Task")
      .insert([{ Id_Reparacion, Id_Mecanico, Hours, State }])
      .select()
      .single(); // devuelve el objeto en lugar de un array

    if (error) throw error;

    res.status(201).json({
      message: "Tarea creada correctamente",
      tarea: data,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});



app.put("/tareas", verifyToken, async (req, res) => {
  try {
    const { Id, Id_Reparacion, Id_Mecanico, Hours, State } = req.body;

    console.log(req.body)

    if (!Id || !Id_Reparacion || !Id_Mecanico || Hours == null || !State) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }
    console.log("ddfd")
    const { data, error } = await supabase
      .from("Task")
      .update({ Id_Reparacion, Id_Mecanico, Hours, State })
      .eq("Id", Id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    res.status(200).json({
      message: "Tarea modificada correctamente",
      tarea: data[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.delete("/tarea/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  try {

    const { error: deleteError } = await supabase
      .from("Task")
      .delete()
      .eq("Id", id);

    if (deleteError) throw deleteError;

    res.json({ message: "Tarea eliminada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar la tarea", detail: err.message });
  }
});


app.get("/tareas-mecanico/:id", verifyToken, async (req, res) => {
  let tasks = [];
  const { id } = req.params;
  try {
    const { data: data2, error: error2 } = await supabase
      .from("Task")
      .select("*")
      .eq("Id_Mecanico", id)
      .eq("State", "Activa");

    if (error2) throw error2;
    tasks.push(...data2)

    res.json({ tasks });


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});

app.get("/factura/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: reparacion, error: errorReparacion } = await supabase
      .from("Reparacion")
      .select("Id_Vehiculo, Id_Cliente, Repair_Request, Date")
      .eq("Id", id)
      .single();

    if (errorReparacion) throw errorReparacion;
    if (!reparacion) return res.status(404).json({ error: "Reparación no encontrada" });

    const { data: vehiculo, error: errorVehiculo } = await supabase
      .from("Vehiculo")
      .select("Car_Plate")
      .eq("Id", reparacion.Id_Vehiculo)
      .single();

    if (errorVehiculo) throw errorVehiculo;

    const { data: cliente, error: errorCliente } = await supabase
      .from("Cliente")
      .select("Name, DNI")
      .eq("Id", reparacion.Id_Cliente)
      .single();

    if (errorCliente) throw errorCliente;

    const { data: piezas, error: errorPiezas } = await supabase
      .from("Reparacion_Pieza")
      .select("*")
      .eq("Id_Reparacion", id);

    if (errorPiezas) throw errorPiezas;

    const { data: tareas, error: errorTareas } = await supabase
      .from("Task")
      .select("Hours")
      .eq("Id_Reparacion", id);

    if (errorTareas) throw errorTareas;

    const totalHours = tareas ? tareas.reduce((sum, task) => sum + (task.Hours || 0), 0) : 0;


    const response = {
      Repair_Request: reparacion.Repair_Request,
      Date: reparacion.Date,
      Vehiculo: vehiculo ? vehiculo.Car_Plate : null,
      Cliente: cliente
        ? { Name: cliente.Name, DNI: cliente.DNI }
        : null,
      Piezas: piezas || [],
      Total_Hours: totalHours,  // <-- Aquí añadimos la suma de horas
    };

    res.json(response);

  } catch (err) {
    console.error("Error en /piezas/:id:", err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});


app.post("/pieza", verifyToken, async (req, res) => {
  const { Id_Reparacion, Name, Price } = req.body;

  if (!Id_Reparacion || !Name || !Price) {
    return res.status(400).json({ error: "Falta algun campo" });
  }

  try {
    const { data, error } = await supabase
      .from("Reparacion_Pieza")
      .insert([
        {
          Id_Reparacion: Id_Reparacion,
          Name: Name,
          Price: Price
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

app.delete("/pieza/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  try {

    const { error: deleteError } = await supabase
      .from("Reparacion_Pieza")
      .delete()
      .eq("Id", id);

    if (deleteError) throw deleteError;

    res.json({ message: "Pieza eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el taller", detail: err.message });
  }
});

app.put("/pieza", verifyToken, async (req, res) => {
  const { Id, Id_Reparacion, Name, Price } = req.body;

  if (!Id || !Id_Reparacion || !Name || !Price) {
    return res.status(400).json({ error: "Falta algun campo" });
  }

  try {
    const { data, error } = await supabase
      .from("Reparacion_Pieza")
      .update([
        {
          Id_Reparacion: Id_Reparacion,
          Name: Name,
          Price: Price
        },
      ])
      .eq("Id", Id)
      .select();

    if (error) throw error;

    res.status(201).json({ message: "Taller creado correctamente", taller: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
});



app.get("/test", (req, res) => {
  res.json({ ok: true });
});


module.exports = serverless(app)*/

const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.json({ ok: true });
});


app.listen(3000, ()=>{
  console.log("okk")
});
