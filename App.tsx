import { StatusBar } from "expo-status-bar"
import { useState, useEffect } from "react"
import {
	TouchableOpacity,
	StyleSheet,
	Text,
	TextInput,
	View,
	Linking,
	Platform,
	FlatList,
	Switch,
} from "react-native"
import * as Location from "expo-location"
import open, { createMapLink } from "react-native-open-maps"
import * as SQLite from "expo-sqlite"
import HR from "./HR"
import * as Speech from "expo-speech"

export default function App() {
	const [location, setLocation] = useState<Location.LocationObject>()
	const [log, setLog] = useState<Array<any>>([])
	const [searchText, setSearchText] = useState<string>("")
	const [mapMode, setMapMode] = useState<boolean>(false)

	const openDatabase = () => {
		if (Platform.OS === "web") {
			return {
				transaction: () => {
					return {
						executeSql: () => {},
					}
				},
			}
		}
		const db = SQLite.openDatabase("db.db")
		return db
	}

	const db = openDatabase()
	useEffect(() => {
		getLocation()

		db.transaction((tx) => {
			tx.executeSql(
				"create table if not exists log (latitude integer, longitude integer, timestamp datetime);"
			)
		})

		db.transaction((tx) => {
			tx.executeSql("select * from items", [], (_, { rows }) =>
				setLog(rows._array)
			)
		})

		setInterval(() => {
			getLocation()
		}, 5000)
	}, [])

	const getLocation = async () => {
		;(async () => {
			await Location.requestForegroundPermissionsAsync()

			let location = await Location.getCurrentPositionAsync({})
			setLocation(location)
		})()
	}

	return (
		<View style={styles.container}>
			<Text>Latitude: {location?.coords.latitude}</Text>
			<Text>Longitude: {location?.coords.longitude}</Text>
			<TouchableOpacity
				style={styles.button}
				onPress={() => getLocation()}>
				<Text>Reload</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.button}
				onPress={() => {
					open({
						latitude: location?.coords.latitude,
						longitude: location?.coords.longitude,
					})
				}}>
				<Text>Open in Maps</Text>
			</TouchableOpacity>
			<HR />
			<TextInput
				style={styles.input}
				value={searchText}
				onChangeText={(text) => setSearchText(text)}
				placeholder="Locality"
			/>
			<TouchableOpacity
				style={styles.button}
				onPress={() => {
					if (searchText.length > 0) {
						Speech.speak(`Opening ${searchText} results`)
						let url = createMapLink({
							query: searchText,
						})
						console.log(url)
						Linking.openURL(url)
					}
				}}>
				<Text>Search</Text>
			</TouchableOpacity>
			<Switch
				trackColor={{ false: "#767577", true: "#81b0ff" }}
				onValueChange={(value) => {
					setMapMode(value)
				}}
				value={mapMode}
			/>
			<HR />
			<TouchableOpacity
				style={styles.button}
				onPress={() => {
					if (location !== undefined) {
						db.transaction((tx) => {
							tx.executeSql(
								"insert into log (latitude, longitude, timestamp) values (?, ?, ?);",
								[
									location.coords.latitude,
									location.coords.longitude,
									new Date().toString(),
								]
							)
						})
					}
				}}>
				<Text>Add to DB</Text>
			</TouchableOpacity>
			{log.length > 0 &&
				log.map((item) => {
					return (
						<View key={item.timestamp}>
							<Text>{item.timestamp}</Text>
							<Text>{item.latitude}</Text>
							<Text>{item.longitude}</Text>
						</View>
					)
				})}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
	},
	button: {
		margin: 5,
		padding: 10,
		borderColor: "black",
		borderWidth: 1,
		borderRadius: 5,
	},
	input: {
		borderColor: "black",
		borderWidth: 1,
		borderRadius: 5,
		paddingLeft: 5,
		paddingRight: 5,
		width: 200,
	},
})
