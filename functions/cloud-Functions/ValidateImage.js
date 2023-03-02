const { fireApp } = require("../firebase");

const documentRef = fireApp.collection('moderate-api-response');

const validateImage = async (req, res, next) => {
    const { key } = req.body;
    const { id } = req.query;  // OR const id = req.params[0]; => in cloud functions it take as  const id = req.params[0]; instance of const id = req.params.id because params return {'0':'123456'} 
    if (!id) {
        return res.status(401).send("Id Not Found !");
    }
    if (!key) {
        return res.status(401).send("Api Key Not Found !");
    }
    let user;
    try {
        await documentRef.where("userid", "==", id).get()
            .then((response) => {
                const data = response.docs.map((doc) => doc.data());
                user = data;
            });
        var image_url = user[0].img_url;
        var axios = require('axios');
        var qs = require("qs");
        var data = qs.stringify({
            'url': image_url,
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
            .then((response) => {
                // console.log(JSON.stringify(response.data));
                const data = response.data;

                const uploadResponse = async (apiResponse) => {
                    await documentRef.doc(id).set({ api_response: apiResponse }, { merge: true })
                        .then(() => {
                            return res.status(201).send({
                                message: "Image is validate, response stored successfully"
                            });
                        })
                        .catch((err) => {
                            console.log("error in store img response", err);
                            return res.status(400).send({
                                message: "Failed to failed to update response",
                                error: err
                            })
                        })
                }
                if (data.error_code === 1011) {
                    return res.status(401).json({
                        error: "Api key not valid",
                        message: data.error
                    });
                }
                uploadResponse(response.data);
            })
            .catch((error) => {
                console.log("Error in moderate content request.", error);
                return res.status(401).send({
                    error,
                    message: "Error in moderate content request. "
                })
            });
    } catch (error) {
        console.log("Error", error);
        return res.status(400).send({
            message: "Error in validation",
            error: error,
        })
    }
};

module.exports = validateImage;