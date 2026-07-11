import { View, Text, StyleSheet } from 'react-native';
export default function BeliefsScreen() {
  return (<View style={styles.c}><Text style={styles.t}>信念</Text></View>);
}
const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' }, t: { fontSize: 20 } });
