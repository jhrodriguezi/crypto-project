/**
 * @fileoverview This file contains the main server code for the Airbnb clone API.
 * It includes the necessary dependencies, middleware, routes, and database connections.
 * The API provides functionality for user registration, login, profile management, place listing, booking, and more.
 * @module api/index
 */
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('./models/User.js')
const Place = require('./models/Place.js')
const Booking = require('./models/Booking.js')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const imageDownloader = require('image-downloader')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const multer = require('multer')
const fs = require('fs')
const mime = require('mime-types')
const morgan = require('morgan')
const path = require('path')
const winston = require('winston');

const cloudinary = require('cloudinary').v2

require('dotenv').config()
const app = express()

const pathTempFiles = path.join(__dirname, '/tmp')

const bcryptSalt = bcrypt.genSaltSync(10)
const jwtSecret = 'fasefraw4r5r3wq45wdfgw34twdfg'
const bucket = 'dawid-booking-app'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Agregar formato de fecha
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] - ${info.message}`) // Personalizar el formato del mensaje
      ),
    }),
    new winston.transports.File({
      filename: 'audit.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Agregar formato de fecha
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] - ${info.message}`) // Personalizar el formato del mensaje
      ),
    }),
  ],
});

app.use(express.json())
app.use(cookieParser())

// Middleware para analizar el cuerpo de las solicitudes
app.use(bodyParser.urlencoded({ extended: true }))

app.use(morgan('dev'))

app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(
  cors({
    credentials: true,
    origin: 'https://localhost:5173',
  })
)

/**
 * Uploads a file to Amazon S3 and returns the public URL of the uploaded file.
 * @param {string} path - The path of the file to upload.
 * @param {string} originalFilename - The original filename of the file.
 * @param {string} mimetype - The MIME type of the file.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
async function uploadToS3(path, originalFilename, mimetype) {
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  })

  const parts = originalFilename.split('.')
  const ext = parts[parts.length - 1]
  const newFilename = Date.now() + '.' + ext
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Body: fs.readFileSync(path),
      Key: newFilename,
      ContentType: mimetype,
      ACL: 'public-read',
    })
  )
  return `https://${bucket}.s3.amazonaws.com/${newFilename}`
}

async function uploadToCloudinary(path, originalFilename, mimetype) {
  try {
    const result = await cloudinary.uploader.upload(path, {
      public_id: originalFilename,
      folder: 'uploads/',
    });

    // Log de éxito al subir a Cloudinary
    logger.info(`Uploaded to Cloudinary - Original Filename: ${originalFilename}, Secure URL: ${result.secure_url}`);

    return result.secure_url;
  } catch (error) {
    // Log de error al subir a Cloudinary
    logger.error(`Error uploading to Cloudinary - Original Filename: ${originalFilename}, Error: ${error.message}`);
    throw error;
  }
}

function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies.token;

    if (!token) {
      // Log de advertencia si no hay token en las cookies
      logger.warn('No token found in cookies');
      return reject(new Error('No token found'));
    }

    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) {
        // Log de error al verificar el token
        logger.error(`Error verifying token: ${err.message}`);
        return reject(err);
      }

      // Log de éxito al obtener datos del usuario desde el token
      logger.info('User data retrieved from token:', userData);
      resolve(userData);
    });
  });
}

app.get('/api/test', (req, res) => {
  mongoose.connect(process.env.MONGO_URL)
  res.json('test ok')
})

app.post('/api/register', async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);
    
    const { name, email, password } = req.body;

    // Log de información sobre el intento de registro
    logger.info(`Registration attempt - Email: ${email}, Name: ${name}`);

    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });

    // Log de éxito en el registro
    logger.info(`User registered successfully - Email: ${userDoc.email}, Name: ${userDoc.name}`);

    res.json(userDoc);
  } catch (e) {
    // Log de error en caso de fallo en el registro
    logger.error(`Error during registration - ${e.message}`);
    
    res.status(422).json(e);
  }
});

app.post('/api/login', async (req, res) => {
  mongoose.connect(process.env.MONGO_URL);
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });

  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);

    if (passOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) {
            logger.error(`Error generating JWT: ${err.message}`);
            throw err;
          }

          // Log de éxito de inicio de sesión
          logger.info(`Successful login for user with email: ${userDoc.email}`);

          res.cookie('token', token).json(userDoc);
        }
      );
    } else {
      // Log de error de contraseña incorrecta
      logger.warn(`Login failed for user with email: ${userDoc.email}, incorrect password`);
      res.status(422).json('pass not ok');
    }
  } else {
    // Log de usuario no encontrado
    logger.warn(`Login failed, user not found for email: ${email}`);
    res.json('not found');
  }
});

app.get('/api/profile', (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);

    const { token } = req.cookies;

    if (token) {
      jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) {
          // Log de error al verificar el token
          logger.error(`Error verifying token: ${err.message}`);
          throw err;
        }

        const { name, email, _id } = await User.findById(userData.id);

        // Log de éxito al obtener el perfil del usuario
        logger.info(`Profile retrieved successfully - User ID: ${_id}, Name: ${name}, Email: ${email}`);

        res.json({ name, email, _id });
      });
    } else {
      // Log de advertencia si no hay token en las cookies
      logger.warn('No token found in cookies');
      res.json(null);
    }
  } catch (e) {
    // Log de error en caso de fallo en la obtención del perfil
    logger.error(`Error retrieving profile: ${e.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/logout', (req, res) => {
  try {
    // Log de información sobre la solicitud de cierre de sesión
    logger.info('Logout request received');

    // Limpiar la cookie de token
    res.cookie('token', '').json(true);

    // Log de éxito al cerrar sesión
    logger.info('Logout successful');
  } catch (e) {
    // Log de error en caso de fallo en el cierre de sesión
    logger.error(`Error during logout: ${e.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/upload-by-link', async (req, res) => {
  const { link } = req.body;
  const newName = 'photo' + Date.now() + '.jpg';

  try {
    // Log de información sobre la solicitud de carga por enlace
    logger.info(`Upload by link request received - Link: ${link}`);

    await imageDownloader.image({
      url: link,
      dest: pathTempFiles + '/' + newName,
    });

    const url = await uploadToCloudinary(
      pathTempFiles + '/' + newName,
      newName,
      mime.lookup(pathTempFiles + '/' + newName)
    );

    // Eliminar el archivo temporal
    fs.unlinkSync(pathTempFiles + '/' + newName);

    // Log de éxito en la carga por enlace
    logger.info(`Upload by link successful - URL: ${url}`);

    res.json(url);
  } catch (e) {
    // Log de error en caso de fallo en la carga por enlace
    logger.error(`Error during upload by link: ${e.message}`);
    res.status(422).json(e);
  }
});

const photosMiddleware = multer({ dest: pathTempFiles });

app.post('/api/upload', photosMiddleware.array('photos', 100), async (req, res) => {
  try {
    // Log de información sobre la solicitud de carga de archivos
    logger.info(`File upload request received - Number of files: ${req.files.length}`);

    const uploadedFiles = [];

    for (let i = 0; i < req.files.length; i++) {
      const { path, originalname, mimetype } = req.files[i];
      const url = await uploadToCloudinary(path, originalname, mimetype);
      uploadedFiles.push(url);
    }

    // Log de éxito en la carga de archivos
    logger.info('File upload successful');

    res.json(uploadedFiles);
  } catch (e) {
    // Log de error en caso de fallo en la carga de archivos
    logger.error(`Error during file upload: ${e.message}`);
    res.status(422).json(e);
  }
});

app.post('/api/places', (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);

    const { token } = req.cookies;
    const {
      title,
      address,
      addedPhotos,
      description,
      price,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
    } = req.body;

    // Log de información sobre la solicitud de creación de un nuevo lugar
    logger.info(`New place creation request received - Title: ${title}, Address: ${address}`);

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) {
        // Log de error al verificar el token
        logger.error(`Error verifying token: ${err.message}`);
        throw err;
      }

      const placeDoc = await Place.create({
        owner: userData.id,
        price,
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
      });

      // Log de éxito en la creación de un nuevo lugar
      logger.info(`New place created successfully - Title: ${title}, Owner ID: ${userData.id}`);

      res.json(placeDoc);
    });
  } catch (e) {
    // Log de error en caso de fallo en la creación de un nuevo lugar
    logger.error(`Error during new place creation: ${e.message}`);
    res.status(422).json(e);
  }
});

app.get('/api/user-places', async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);
    const { token } = req.cookies;

    // Log de información sobre la solicitud de lugares del usuario
    logger.info('User places request received');

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) {
        // Log de error al verificar el token
        logger.error(`Error verifying token: ${err.message}`);
        throw err;
      }

      const { id } = userData;
      const places = await Place.find({ owner: id });

      // Log de éxito al obtener lugares del usuario
      logger.info(`User places retrieved successfully - User ID: ${id}`);

      res.json(places);
    });
  } catch (e) {
    // Log de error en caso de fallo al obtener lugares del usuario
    logger.error(`Error during user places retrieval: ${e.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);
    const { id } = req.params;

    // Log de información sobre la solicitud de un lugar específico
    logger.info(`Place request received - Place ID: ${id}`);

    const place = await Place.findById(id);

    // Log de éxito al obtener un lugar específico
    logger.info(`Place retrieved successfully - Place ID: ${id}`);

    res.json(place);
  } catch (e) {
    // Log de error en caso de fallo al obtener un lugar específico
    logger.error(`Error during place retrieval: ${e.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/places', async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);
    const { token } = req.cookies;
    const {
      id,
      title,
      address,
      addedPhotos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    } = req.body;

    // Log de información sobre la solicitud de actualización de un lugar
    logger.info(`Place update request received - Place ID: ${id}`);

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) {
        // Log de error al verificar el token
        logger.error(`Error verifying token: ${err.message}`);
        throw err;
      }

      const placeDoc = await Place.findById(id);

      if (userData.id === placeDoc.owner.toString()) {
        placeDoc.set({
          title,
          address,
          photos: addedPhotos,
          description,
          perks,
          extraInfo,
          checkIn,
          checkOut,
          maxGuests,
          price,
        });

        await placeDoc.save();

        // Log de éxito en la actualización de un lugar
        logger.info(`Place updated successfully - Place ID: ${id}`);

        res.json('ok');
      }
    });
  } catch (e) {
    // Log de error en caso de fallo en la actualización de un lugar
    logger.error(`Error during place update: ${e.message}`);
    res.status(422).json(e);
  }
});

app.get('/api/places', async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);

    // Log de información sobre la solicitud de obtener todos los lugares
    logger.info('All places request received');

    const places = await Place.find();

    // Log de éxito al obtener todos los lugares
    logger.info('All places retrieved successfully');

    res.json(places);
  } catch (e) {
    // Log de error en caso de fallo al obtener todos los lugares
    logger.error(`Error during all places retrieval: ${e.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);

    // Log de información sobre la solicitud de creación de una reserva
    logger.info('Booking creation request received');

    const userData = await getUserDataFromReq(req);
    const { place, checkIn, checkOut, numberOfGuests, name, phone, price } = req.body;

    Booking.create({
      place,
      checkIn,
      checkOut,
      numberOfGuests,
      name,
      phone,
      price,
      user: userData.id,
    })
      .then((doc) => {
        // Log de éxito en la creación de una reserva
        logger.info(`Booking created successfully - Booking ID: ${doc._id}`);
        res.json(doc);
      })
      .catch((err) => {
        // Log de error en caso de fallo en la creación de una reserva
        logger.error(`Error during booking creation: ${err.message}`);
        throw err;
      });
  } catch (e) {
    // Log de error en caso de fallo en la creación de una reserva
    logger.error(`Error during booking creation: ${e.message}`);
    res.status(422).json(e);
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    mongoose.connect(process.env.MONGO_URL);

    // Log de información sobre la solicitud de obtener todas las reservas del usuario
    logger.info('User bookings request received');

    const userData = await getUserDataFromReq(req);
    const bookings = await Booking.find({ user: userData.id }).populate('place');

    // Log de éxito al obtener todas las reservas del usuario
    logger.info('User bookings retrieved successfully');

    res.json(bookings);
  } catch (e) {
    // Log de error en caso de fallo al obtener todas las reservas del usuario
    logger.error(`Error during user bookings retrieval: ${e.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(4000)
