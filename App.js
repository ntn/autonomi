import React from "react";
import axios from "axios";
import {
  ActivityIndicator,
  Button,
  Clipboard,
  FlatList,
  Image,
  Share,
  StyleSheet,
  Text,
  ScrollView,
  View,
} from "react-native";
import * as Permissions from "expo-permissions";
import * as ImagePicker from "expo-image-picker";
import Environment from "./config/environment";
import firebase from "./config/firebase";

export default class App extends React.Component {
  state = {
    image: null,
    uploading: false,
    googleResponse: null,
  };

  async componentDidMount() {
    await Permissions.askAsync(Permissions.CAMERA_ROLL);
    await Permissions.askAsync(Permissions.CAMERA);
  }

  render() {
    let { image } = this.state;

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.getStartedContainer}>
            <Text style={styles.getStartedText}>Autonomi</Text>
          </View>
          {this.state.checkout && this.state.checkout == true ? (
            this.state.complete && this.state.complete == true ? (
              <View>
                <div style={{ margin: 50 }}></div>
                <Text style={styles.successfulCheckout}>
                  Checkout Successful!
                </Text>
              </View>
            ) : (
              <View>
                <div style={{ padding: 5, center: 50 }}></div>
                <div
                  style={{
                    padding: 50,
                    margin: 30,
                    center: 50,
                    backgroundColor: "#CCFFFF",
                  }}
                >
                  <div>
                    <div>
                      <Text style={styles.getStartedText}>CART</Text>
                    </div>
                  </div>
                  <Text style={styles.recieptText}>Banana (1) - $5.00</Text>
                </div>
                <Button
                  title={"CHECKOUT"}
                  onPress={() => {
                    this.setState({
                      fromFetch: false,
                      loading: true,
                      checkout: true,
                    });
                    axios
                      .post(
                        "https://api.sandbox.checkbook.io/v3/invoice",
                        {
                          amount: 5,
                          description: "Receipt: Banana - $5",
                          name: "Your Local Grocer",
                          recipient: "",
                        },
                        {
                          headers: {
                            Authorization: "",
                          },
                        }
                      )
                      .then((response) => {
                        console.log("getting data from axios", response.data);
                        setTimeout(() => {
                          this.setState({
                            loading: false,
                            axiosData: response.data,
                            checkout: true,
                            complete: true,
                          });
                        }, 2000);
                      })
                      .catch((error) => {
                        console.log(error);
                      });
                  }}
                  color="green"
                />
              </View>
            )
          ) : (
            <View style={styles.helpContainer}>
              <Button onPress={this._pickImage} title="Select Image" />

              {this.state.googleResponse && (
                <FlatList
                  data={this.state.googleResponse.responses[0].labelAnnotations}
                  extraData={this.state}
                  keyExtractor={this._keyExtractor}
                  renderItem={({ item }) => (
                    <Text style={{ fontSize: 40, fontWeight: "bold" }}>
                      {item.description}
                    </Text>
                  )}
                />
              )}
              {this._maybeRenderImage()}
              {this._maybeRenderUploadingOverlay()}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  organize = (array) => {
    return array.map(function (item, i) {
      return (
        <View key={i}>
          <Text>{item}</Text>
        </View>
      );
    });
  };

  _maybeRenderUploadingOverlay = () => {
    if (this.state.uploading) {
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <ActivityIndicator color="#fff" animating size="large" />
        </View>
      );
    }
  };

  _maybeRenderImage = () => {
    let { image, googleResponse } = this.state;
    if (!image) {
      return;
    }

    return (
      <View
        style={{
          marginTop: 20,
          width: 250,
          borderRadius: 3,
          elevation: 2,
        }}
      >
        <Button
          style={{ marginBottom: 10 }}
          onPress={() => this.submitToGoogle()}
          title="Scan!"
        />

        <View
          style={{
            borderTopRightRadius: 3,
            borderTopLeftRadius: 3,
            shadowColor: "rgba(0,0,0,1)",
            shadowOpacity: 0.2,
            shadowOffset: { width: 4, height: 4 },
            shadowRadius: 5,
            overflow: "hidden",
          }}
        >
          <Image source={{ uri: image }} style={{ width: 250, height: 250 }} />
        </View>
        {this.state.added && this.state.added == true ? (
          <>
            <Button
              style={{ marginBottom: 10, padding: 10 }}
              disabled
              title="Added"
            />
            <Button
              style={{ marginBottom: 10 }}
              onPress={() => this.setState({ checkout: true })}
              title="Checkout(1)"
            />
          </>
        ) : (
          <Button
            style={{ marginBottom: 10 }}
            onPress={() => this.setState({ added: true })}
            title="Add to Cart"
          />
        )}
        <Text
          onPress={this._copyToClipboard}
          onLongPress={this._share}
          style={{ paddingVertical: 10, paddingHorizontal: 10 }}
        />
      </View>
    );
  };

  _keyExtractor = (item, index) => item.id;

  _renderItem = (item) => {
    <Text>response: {JSON.stringify(item)}</Text>;
  };

  _share = () => {
    Share.share({
      message: JSON.stringify(this.state.googleResponse.responses),
      title: "Check it out",
      url: this.state.image,
    });
  };

  _copyToClipboard = () => {
    Clipboard.setString(this.state.image);
    alert("Copied to clipboard");
  };

  _takePhoto = async () => {
    let pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });

    this._handleImagePicked(pickerResult);
  };

  _pickImage = async () => {
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });

    this._handleImagePicked(pickerResult);
  };

  _handleImagePicked = async (pickerResult) => {
    try {
      this.setState({ uploading: true });

      if (!pickerResult.cancelled) {
        const uploadUrl = await uploadImageAsync(pickerResult.uri);
        this.setState({ image: uploadUrl });
      }
    } catch (e) {
      console.log(e);
      alert("Upload failed, sorry :(");
    } finally {
      this.setState({ uploading: false });
    }
  };

  submitToGoogle = async () => {
    try {
      this.setState({ uploading: true });
      let { image } = this.state;
      let body = JSON.stringify({
        requests: [
          {
            features: [{ type: "LABEL_DETECTION", maxResults: 1 }],
            image: {
              source: {
                imageUri: image,
              },
            },
          },
        ],
      });
      let response = await fetch(
        "https://vision.googleapis.com/v1/images:annotate?key=" +
          Environment["GOOGLE_CLOUD_VISION_API_KEY"],
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          method: "POST",
          body: body,
        }
      );
      let responseJson = await response.json();
      console.log(responseJson);
      this.setState({
        googleResponse: responseJson,
        uploading: false,
      });
    } catch (error) {
      console.log(error);
    }
  };
}

async function uploadImageAsync(uri) {
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.log(e);
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });

  const ref = firebase
    .storage()
    .ref()
    .child("e0526729-c1f2-4437-ab95-15e4a7beb59d");
  const snapshot = await ref.put(blob);

  return await snapshot.ref.getDownloadURL();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#add8e6",
    paddingBottom: 10,
  },
  developmentModeText: {
    marginBottom: 20,
    color: "rgba(0,0,0,0.4)",
    fontSize: 14,
    lineHeight: 19,
    textAlign: "center",
  },
  contentContainer: {
    paddingTop: 30,
  },

  getStartedContainer: {
    alignItems: "center",
    marginHorizontal: 50,
  },

  getStartedText: {
    fontSize: 37,
    color: "rgba(96,100,109, 1)",
    lineHeight: 24,
    textAlign: "center",
  },

  helpContainer: {
    marginTop: 15,
    alignItems: "center",
  },

  recieptText: {
    fontSize: 15,
    color: "rgba(96,100,109, 1)",
    lineHeight: 24,
    textAlign: "center",
  },

  successfulCheckout: {
    fontSize: 25,
    padding: 75,
    color: "rgba(96,100,109, 1)",
    backgroundColor: "#CCFFFF",
    lineHeight: 24,
    textAlign: "center",
  },
});
