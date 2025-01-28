require('dotenv').config()
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
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
        // await client.connect();

        const database = client.db('tourBanglaDB');
        const userCollection = database.collection('users');
        const packageCollection = database.collection('packages');


        // creating jwt token
        app.post('/jwt', (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '365d' });
            res.send({ token })
        })
        //packages routes
        // get all package data 
        app.get('/packages', async (req, res) => {
            const random = req.query.random;
            if (random) {
                const result = await packageCollection.aggregate([{ $sample: { size: 3 } }]).toArray();
                res.send(result);
            } else {
                const result = await packageCollection.find().toArray();
                res.send(result);
            }
        })
        // get single package data
        app.get('/package/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id : new ObjectId(id)};
            const result = await packageCollection.findOne(query);
            res.send(result);
        })

        //users routes
        app.post("/users", async (req, res) => {
            const data = req.body;
            const isExist = await userCollection.findOne({ email: data.email });
            if (isExist) {
                res.status(409).send({ message: 'user already exist', insertedId: null })
            } else {
                const result = await userCollection.insertOne(data);
                res.send(result);
            }

        })
        // isAdmin 
        app.get('/user/role', async(req, res)=>{
            const email = req.query.email;
            const query ={ email : email};
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role ==='admin';
            const isTourGuide = user?.role ==='tour-guide';
            const isTourist = user?.role ==='tourist';
            const result = {isAdmin, isTourGuide, isTourist};
            res.send(result)

        })
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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

