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
const { uploadImage, validateImage, updateUser } = require("./cloud-Functions");

var serviceAccount = require("./admin.json"); // paste firebase Secrete key inside in your admin.json file 

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const userRef = admin.firestore().collection("users");
const imageRef = admin.firestore().collection("user_upload_images");

const storage = new Storage({
    keyFilename: "./admin.json",
});

app.post("/user_upload_assessment", async (req, res) => {
    const form = new formidable.IncomingForm({ multiples: true });

    try {
        form.parse(req, async (err, fields, files) => {
            let uuid = UUID();
            var downLoadPath = 'https://firebasestorage.googleapis.com/v0/b/fir-upload-b072b.appspot.com/o/';
            const profileImage = files.profileImage;

            if (!profileImage) {
                return res.status(400).json({
                    message: "Image not found, try again",
                    data: {},
                    error: err,
                })
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
                    destination: `user_upload_assessment/${profileImage.name}`,
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
                createdAt: Date.now(),
            };

            await userRef.doc(docId).set(userModel, { merge: true })
                .then(async (value) => {

                    const imgData = {
                        "img_url": "https://firebase/user_upload_assessment/sample_face_6.jpg",
                        "userid": docId,
                        "creation_date": userModel.date,
                        "purpose": {
                            "type": "cover_picture",
                            "destination_document": `/users/${docId}`,
                            "content": {
                                "cover_picture": userModel.profileImage
                            }
                        },
                        "api_response": userModel,
                        "process": false
                    }

                    res.status(200).send(imgData);

                }).catch((error) => {
                    console.log(error);
                    res.status(500).send({
                        error,
                        message: "Error in Create User."
                    })
                })
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

app.post("/user/image/moderate/:id", async (req, res, next) => {
    const { key } = req.body;
    const { id } = req.params;
    if (!id) {

        res.status(401).send("Id Not Found !");
    }
    if (!key) {
    }
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
            // 'url': image_url,
            'url': "https://firebasestorage.googleapis.com/v0/b/fir-upload-b072b.appspot.com/o/users%2FProfileImg.png?alt=media&token=53e124fd-23ac-4fa9-ae01-416c5909da6a",
            'key': key
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
                // console.log(JSON.stringify(response.data));
                const data = response.data;
                const uploadResponse = async (imgData) => {
                    // const docId = imageRef.doc().id;
                    // await imageRef.doc(id).set(imgData, { merge: true })
                    //     .then(() => {
                    //         res.status(200).send("Image Validation Stored Successfully");
                    //     })
                    //     .catch((err) => {
                    //         console.log("error in store img response", err);
                    //         res.status(400).send("Failed to store image validation")
                    //     })

                    const bucketName = "gs://fir-upload-b072b.appspot.com";
                    const destinationFile = storage.bucket(bucketName).file(`user_upload_images/test.png`);
                    await storage.bucket(bucketName).file(`user_upload_assessment/Veda.png`).copy(destinationFile); // this is for get source img and set on destiny 

                    res.send("after file copy");
                }
                if (data.rating_index === 1 || data.rating_index === 2) {
                    const imgData = {
                        "img_url": "https://firebase/user_upload_assessment/sample_face_6.jpg",
                        "userid": user[0].id,
                        "creation_date": new Date(),
                        "purpose": {
                            "type": "cover_picture",
                            "destination_document": `/users/${user[0].id}`,
                            "content": {
                                "cover_picture": image_url
                            }
                        },
                        "api_response": response.data,
                        "process": true
                    }
                    res.status(201).send(response.data);
                    // uploadResponse(imgData);

                } else {
                    res.status(401).send("Image is not appropriate. Try another")
                }
            })
            .catch(function (error) {
                res.status(401).json({
                    error,
                    message: "Error in moderate content request. "
                })
            });
    } catch (error) {
        return res.status(400).json({
            message: "Error in validation",
            error: error,
        })
    }

});

app.put("/update/user/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await admin.firestore().collection(`user_upload_images`).doc(`${id}`).get();
        const user = doc.data();
        if (!user) {
            res.status(400).send("User not found");
        }
        res.status(200).send(user);
    } catch (error) {
        console.log(error);
        res.status(400).json({
            error,
            message: "Error in get request."
        })
    }
})

exports.api = functions.https.onRequest(app);
exports.uploadImage = functions.https.onRequest(uploadImage);
exports.validateImage = functions.https.onRequest(validateImage);
exports.updateUser = functions.https.onRequest(updateUser);
