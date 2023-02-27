const functions = require('firebase-functions');
const { Storage } = require('@google-cloud/storage');
const UUID = require('uuid-v4');
const express = require('express');
const formidable = require("formidable-serverless");
require('dotenv').config();

const app = express();
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
var admin = require("firebase-admin");

var serviceAccount = require("./admin.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const userRef = admin.firestore().collection("users");
const storage = new Storage({
    keyFilename: "admin.json",
});

app.post("/createUser", async (req, res) => {
    const form = new formidable.IncomingForm({ multiples: true });

    try {
        form.parse(req, async (err, fields, files) => {
            let uuid = UUID();
            var downLoadPath = 'https://firebasestorage.googleapis.com/v0/b/fir-upload-b072b.appspot.com/o/';
            const profileImage = files.profileImage;
            console.log("Path from Vs--> ", profileImage.path);
            if (!profileImage) {
                return res.status(400).json({
                    message: "Image not found, try again",
                    data: {},
                    error: err,
                })
            } else {


            }

            // url of the uploaded image
            let imageUrl;
            const docId = userRef.doc().id;
            if (err) {
                return res.status(400).json({
                    message: "There was an error parsing the files",
                    data: {},
                    error: err,
                })
            }
            const bucket = storage.bucket("gs://fir-upload-b072b.appspot.com");
            if (profileImage.size === 0) {
                return res.send("Uploaded file is empty");
            } else {
                const imageResponse = await bucket.upload(profileImage.path, {
                    destination: `users/${profileImage.name}`,
                    resumable: true,
                    metadata: {
                        metadata: {
                            firebaseStorageDownloadTokens: uuid,
                        },
                    },
                });
                // profile image url
                imageUrl =
                    downLoadPath +
                    encodeURIComponent(imageResponse[0].name) + "?alt=media&token=" + uuid
            }
            // object to send to database
            const userModel = {
                id: docId,
                name: fields.name,
                email: fields.email,
                age: fields.age,
                profileImage: profileImage.size === 0 ? "" : imageUrl,
            };

            await userRef.doc(docId).set(userModel, { merge: true })
                .then((value) => {
                    res.status(200).send({
                        message: "User created successfully",
                        data: userModel,
                        error: {},
                    });
                });
        });

    } catch (error) {
        res.send({
            message: "Something went wrong",
            data: {},
            error: err,
        })
    }
});

app.get("/getUsers", async (req, res, next) => {
    await userRef.get().then((value) => {
        try {
            const data = value.docs.map((doc) => doc.data());
            res.status(200).send({
                message: "Fetched all users",
                data: data,
            });
        } catch (error) {
            console.log("error in catch", error);
            res.status(500).json({
                message: "Error in get req",
                error
            });
        }
    });
});

app.get("/getUsers/:id", async (req, res, next) => {
    try {
        await userRef.where("id", "==", req.params.id).get()
            .then((response) => {
                // console.log("From by id", response.docs.data());
                const data = response.docs.map((doc) => doc.data());
                res.status(200).send({
                    message: "User retrieved",
                    data: data,
                });
            });
    } catch (error) {
        res.status(500).json({
            message: "Error in get req",
            error
        });
    }
});

app.get("/getUsers/validate/:id", async (req, res, next) => {
    // console.log("in get id", req.params.id);
    let user;
    try {
        await userRef.where("id", "==", req.params.id).get()
            .then((response) => {
                const data = response.docs.map((doc) => doc.data());
                user = data;
            });
        var image_url = user[0].profileImage;
        console.log(image_url);
        var axios = require('axios');
        var qs = require("qs");
        var data = qs.stringify({
            'url': image_url,
            'key': 'aa1b16ab74b196c0b0ebd62bfb0168f8'
        });
        var config = {
            method: 'post',
            url: `https://api.moderatecontent.com/moderate/`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };

        axios(config)
            .then(function (response) {
                // console.log("in response");
                // console.log(JSON.stringify(response.data));
                res.status(200).send(response.data)
            })
            .catch(function (error) {
                console.log(error);
                res.status(401).send(error)
            });
    } catch (error) {
        return res.status(400).send("Error in Here")
    }

});

exports.api = functions.https.onRequest(app)


// {
//     "img_url": "https://firebase/user_upload_assessment/sample_face_6.jpg",
//     "userid": "DFCI-02000000042679C465D54897E5431D1E9ED0F9E10DDD99D469C5B7357273D700D13BE162",
//     "creation_date": "23/November/2022 14:23 232",
//     "purpose": {
//       "type": "cover_picture",
//       "destination_document": "/users/DFCI-02000000042679C465D54897E5431D1E9ED0F9E10DDD99D469C5B7357273D700D13BE162",
//       "content": {
//         "cover_picture": "https://firebase/user_upload_images/sample_face_6.jpg"
//       }
//     },
//     "api_response": {
//       "url_classified": "https://firebase/user_upload_assessment/sample_face_6.jpg",
//       "rating_index": 2,
//       "rating_letter": "t",
//       "predictions": {
//         "teen": 72.6473867893219,
//         "everyone": 26.903659105300903,
//         "adult": 0.4489644430577755
//       },
//       "rating_label": "teen",
//       "error_code": 0
//     },
//     "process": true
//   }