const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
require('dotenv').config()
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,

}
// middleware
app.use(cors(corsOptions));
app.use(cookieParser())
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
console.log(process.env.DB_PASS, process.env.DB_USER , "user credentials")
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.780sf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
// token verification
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) return res.status(401).send({ message: 'unauthorize access token not found' })
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorize access' })
        }

        req.user = decoded;
        next()
    })
}
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db('tourBanglaDB')
        // const menuCollection = database.collection("menu's");
        // const userCollection = database.collection("users");
        // const cartCollection = database.collection("carts");
        // const reviewCollection = database.collection("reviews");

        // creating jwt token

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('tourbangla is running')
})

app.listen(port, () => {
    console.log(`TourBangla is running on port ${port}`);
})

