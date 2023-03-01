const updateUser = (async (req, res, next) => {
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

module.exports = updateUser;