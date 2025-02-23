require('dotenv').config()
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: ['http://localhost:5173', 'https://bistro-boss-2c4ab.web.app', 'http://localhost:5174'],
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
        const applicationCollection = database.collection('applications');
        const BookingsCollection = database.collection('bookings');


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
        app.get('/package/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await packageCollection.findOne(query);
            res.send(result);
        })

        //users routes
        app.post("/users", async (req, res) => {
            const data = req.body;
            const isExist = await userCollection.findOne({ email: data.email });
            if (isExist) {
                return (res.status(409).send({ message: 'user already exist', insertedId: null }))
            } else {
                const result = await userCollection.insertOne(data);
                res.send(result);
            }

        })
        //single user route 
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            if (!email) {
                res.send('No email found ')
            }
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        // update user data
        app.patch('/modifyUser', async (req, res) => {
            const data = req.body;
            const filter = { email: data?.email };
            const updateDoc = {
                $set: {
                    name: data?.name,
                    email: data?.email
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        // isAdmin 
        app.get('/role-type', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send('email not found')
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const role = user?.role;
            const isAdmin = (role === 'admin');
            const isTourGuide = (role === 'tour-guide');
            const isTourist = (role === 'tourist');
            const result = { isAdmin, isTourGuide, isTourist };
            res.send(result)


        })
        // get all tour-guides
        app.get('/tour-guides', async (req, res) => {
            const filter = { role: 'tour-guide' };
            const result = await userCollection.find(filter).toArray();
            res.send(result);

        })


        // applications routes

        app.post('/application/tour-guide', async (req, res) => {
            const applicationData = req.body;
            const isApplied = await applicationCollection.findOne({ applicantEmail: applicationData?.applicantEmail })
            if (isApplied) {
                return (res.status(409).send({ message: 'User already applied', insertedId: null }))
            } else {
                const result = await applicationCollection.insertOne(applicationData);
                res.send(result);
            }
        })

        app.get('/applicants', async (req, res) => {
            const applicants = await applicationCollection.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'applicantEmail',
                        foreignField: 'email',
                        as: 'applicantData',

                    }
                },
                {
                    $unwind: '$applicantData',
                },
                {
                    $project: {
                        _id: 1,
                        applicantEmail: 1,
                        cv: 1,
                        inspiration: 1,
                        title: 1,
                        'applicantData.name': 1,
                        'applicantData.role': 1,
                        'applicantData.photoURL': 1,
                    }
                }
            ]).toArray();
            res.send(applicants);

        })
        // reject applicant

        app.post('/applicant', async (req, res) => {
            const isReject = req.query.reject;
            const { id, applicantEmail } = req.body;
            const updateDoc = {
                $set: {
                    role: 'tour-guide'
                }
            }
            if (isReject) {
                const deleteApplication = await applicationCollection.deleteOne({ _id: new ObjectId(id) });
                res.send({ deleteStat: deleteApplication, rejectionCount: 1 })

            } else {

                const makeTourGuide = await userCollection.updateOne({ email: applicantEmail }, updateDoc);
                const deleteApplication = await applicationCollection.deleteOne({ applicantEmail });
                res.send({ acceptationCount: 1, statusUpdate: makeTourGuide, deleteStat: deleteApplication })
            }
        })
        // bookings
        app.post('/booking', async (req, res) => {
            const data = req.body;
            const result = await BookingsCollection.insertOne(data);
            res.send(result)
        })
        app.get('/bookedPackages', async (req, res) => {
            const email = req.query.email;
            const filter = { userEmail: email };
            const result = await BookingsCollection.find(filter).toArray();
            res.send(result);
        })
        //cancel booked tour
        app.delete('/cancel-booking', async (req, res) => {
            const data = req.body;
            const filter = {
                packageId: data?.packageId,
                userEmail: data?.email,
            };
            const result = await BookingsCollection.deleteOne(filter);
            res.send(result);
        })

        // tour-guide assigned tours
        app.get('/assigned-tours', async (req, res) => {
            const email = req.query.email;
            const result = await BookingsCollection.find({ guideEmail: email }).toArray();
            res.send(result);
        })
        // reject assigned tour by tour-guide
        app.patch('/tour-rejection', async(req, res)=>{
            const {clientEmail, guideEmail, packageId} = req.body;
            const filter = {
                userEmail: clientEmail,
                guideEmail: guideEmail,
                packageId : packageId
            }
            const updateDoc ={
                $set:{
                    status:'rejected'
                }
            }
            const result = await BookingsCollection.updateOne(filter, updateDoc );
            res.send(result);

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

