const { Storage } = require("@google-cloud/storage")
const UUID = require('uuid-v4');
const formidable = require('formidable-serverless');
const { fireApp } = require('../firebase')

const userRef = fireApp.collection('users');
const docRef = fireApp.collection('moderate-api-response');

const storage = new Storage({
    keyFilename: "admin.json",  // Firebase Api key file.
})

const uploadImage = async (req, res) => {
    const form = new formidable.IncomingForm({ multiples: true });
    const { id } = req.query;

    if (!form) {
        return res.status(400).send("Form or File is empty");
    }
    if (!id) {
        return res.status(400).send("Id should not empty");
    }

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
                });
            }
            // url of the uploaded image
            let imageUrl;
            const docId = docRef.doc().id;
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
                const doc = await userRef.doc(id).get();
                const user = doc.data();
                const userName = user.name.split(" ").join("");

                const imageResponse = await bucket.upload(profileImage.path, {
                    destination: `user_upload_assessment/${id}_${userName}.png`,
                    resumable: true,
                    metadata: {
                        metadata: {
                            firebaseStorageDownloadTokens: uuid,
                        },
                    },
                });
                // profile image url
                console.log(" after else bucket", imageResponse);
                imageUrl =
                    downLoadPath +
                    encodeURIComponent(imageResponse[0].name) + "?alt=media&token=" + uuid
            }
            // object to send to database for create new user
            // const userModel = {
            //     id: docId,
            //     name: fields.name,
            //     email: fields.email,
            //     age: fields.age,
            //     profileImage: profileImage.size === 0 ? "" : imageUrl,
            //     createdAt: Date.now(),
            // };
            const document = {
                "img_url": profileImage.size === 0 ? "" : imageUrl,
                "userid": id,
                "creation_date": Date(),
                "purpose": {
                    "type": "cover_picture",
                    "destination_document": `/users/${id}`,
                    "content": {
                        "cover_picture": ""
                    }
                },
                "api_response": {},
                "process": false
            }
            await docRef.doc(id).set(document, { merge: true }
            ).then((response) => {
                return res.status(200).json({
                    message: "Uploading image validate within seconds",
                    document,
                });

            }).catch((error) => {
                console.log(error);
                return res.status(500).send({
                    error,
                    message: "Error in Create User."
                })
            })
        });

    } catch (error) {
        return res.send({
            message: "Something went wrong",
            data: {},
            error: err,
        })
    }
};

module.exports = uploadImage 