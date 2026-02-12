/**
 * Screening form using SQLite offline queue.
 * Uses image picker, computeEmbeddingLocalServer, and queue_sqlite.
 * Install: npm install react-native-image-picker react-native-fs
 */
import React, { useState } from "react";
import { View, Button, TextInput, Text } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import RNFS from "react-native-fs";
import { queueCase } from "../storage/queue_sqlite";
import { computeEmbeddingLocalServer } from "../compute/computeEmbeddingLocalServer";

export default function ScreeningForm() {
  const [age, setAge] = useState("");
  const [obs, setObs] = useState("");
  const [status, setStatus] = useState("");

  async function pickAndQueue() {
    const res = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
    if (!res || res.didCancel) return;
    const asset = res.assets[0];
    const dest = `${RNFS.DocumentDirectoryPath}/img-${Date.now()}.jpg`;
    await RNFS.copyFile(asset.uri.replace("file://", ""), dest);
    const localUri = `file://${dest}`;
    setStatus("Computing embedding...");
    const embResp = await computeEmbeddingLocalServer(localUri);
    await queueCase({
      childAgeMonths: parseInt(age, 10),
      observations: obs,
      imagePath: localUri,
      embeddingB64: embResp.embeddingB64,
      shape: embResp.shape,
    });
    setStatus("Queued.");
  }

  return (
    <View>
      <TextInput
        placeholder="age months"
        keyboardType="numeric"
        value={age}
        onChangeText={setAge}
      />
      <TextInput
        placeholder="observations"
        value={obs}
        onChangeText={setObs}
      />
      <Button title="Pick & Queue" onPress={pickAndQueue} />
      <Text>{status}</Text>
    </View>
  );
}
