const { fireApp } = require('../firebase')
const UUID = require('uuid-v4');
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
    keyFilename: "admin.json",
});

const documentRef = fireApp.collection("moderate-api-response");
const userRef = fireApp.collection("users");
const updateUser = (async (req, res, next) => {
    const { id } = req.query;
    let uuid = UUID();
    var downLoadPath = 'https://firebasestorage.googleapis.com/v0/b/fir-upload-b072b.appspot.com/o/';

    if (!id) {
        return res.status(401).send("Id Not Found !");
    }
    let userDocArr;
    try {
        await documentRef.where("userid", "==", id).get()
            .then((response) => {
                const data = response.docs.map((doc) => doc.data());
                userDocArr = data;
            });
        const userDoc = userDocArr[0];
        const api_response = Object.keys(userDoc.api_response).length;
        if (api_response === 0) {
            return res.status(400).send({
                message: "First validate the image. Api response is empty"
            })
        }
        if (userDoc.api_response.rating_index === 1 || userDoc.api_response.rating_index === 2) {
            try {
                const doc = await userRef.doc(id).get();  // it two lines for get 
                const user = doc.data();
                const userName = user.name.split(" ").join("");
                const imageName = `${id}_${userName}`;

                const bucketName = "gs://fir-upload-b072b.appspot.com";
                const destinationFile = storage.bucket(bucketName).file(`user_upload_images/${imageName}.png`);
                const imageResponse = await storage.bucket(bucketName).file(`user_upload_assessment/${imageName}.png`, {
                    resumable: true,
                    metadata: {
                        metadata: {
                            firebaseStorageDownloadTokens: uuid,
                        },
                    },
                }).copy(destinationFile); // this is for get source img and set on destiny (destinationFile)

                imageUrl =
                    downLoadPath +
                    encodeURIComponent(imageResponse[0].name) + "?alt=media&token=" + uuid

                await userRef.doc(id).set({ cover_picture: imageUrl }, { merge: true });
                return res.status(201).send({
                    message: "Image copy in CDN, and updated Users cover_picture successfully",
                    cover_picture: imageUrl
                });

                // Get url of file those store in firebase storage and and time limit to url for expire after some days, using expires
                // const config = {
                //     action: 'read',
                //     expires: '03-09-2023',
                // };

                // storage.bucket(bucketName).file(`user_upload_images/${imageName}.png`).getSignedUrl(config).then((url) => {
                //     console.log(`Image URL: ${url}`);
                //     return res.send({ url });
                // }).catch((error) => {
                //     console.error(`Error getting signed URL for ${imageName}:`, error);
                //     return res.send("Error in getting image url");
                // });

            } catch (error) {
                console.log(error);
                return res.status(201).send("Failed to update cover pic");
            }
        } else {
            return res.status(401).send("Image is not appropriate. Try another")
        }

        //             // Shortcut method for copy file inside firebase bucket storage;

        //             const bucketName = "gs://fir-upload-b072b.appspot.com";
        //             const destinationFile = storage.bucket(bucketName).file(`user_upload_images/test.png`);
        //             await storage.bucket(bucketName).file(`user_upload_assessment/Veda.png`).copy(destinationFile); // this is for get source img and set on destiny 
        //             res.send("after file copy");

    } catch (error) {
        return res.status(400).json({
            message: "Error in validation",
            error: error,
        })
    }
});

module.exports = updateUser;