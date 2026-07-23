import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Audiometry, Patient, Settings } from '@/db/db';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 10 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 12, textAlign: 'center', color: '#666' },
  section: { margin: 10, padding: 10 },
  text: { fontSize: 12, marginBottom: 5 },
  bold: { fontWeight: 'bold' },
  reportBox: { marginTop: 20, padding: 10, border: '1 solid #000', minHeight: 100 },
  signature: { marginTop: 60, borderTopWidth: 1, borderTopColor: '#000', width: 200, alignSelf: 'center', paddingTop: 5, textAlign: 'center' }
});

export const ReportPDF = ({ exam, patient, settings }: { exam: Audiometry, patient: Patient, settings: Settings }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{settings?.clinicName || 'Clínica de Audiologia'}</Text>
        <Text style={styles.subtitle}>{settings?.professionalName} - CRFa: {settings?.crfaNumber}</Text>
        <Text style={styles.subtitle}>{settings?.address} | {settings?.phone}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.text}><Text style={styles.bold}>Paciente:</Text> {patient.name}</Text>
        <Text style={styles.text}><Text style={styles.bold}>CPF:</Text> {patient.cpf}</Text>
        <Text style={styles.text}><Text style={styles.bold}>Data do Exame:</Text> {exam.examDate}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.text, styles.bold]}>Anamnese:</Text>
        <Text style={styles.text}>Queixa: {exam.anamnesis.queixa}</Text>
        <Text style={styles.text}>Zumbido: {exam.anamnesis.zumbido}</Text>
        <Text style={styles.text}>Tontura: {exam.anamnesis.tontura}</Text>
      </View>

      {/* SVG rendering in react-pdf requires Image (converting SVG to PNG first or using SVG components from react-pdf). 
          For simplicity, we leave a placeholder space. */}
      <View style={styles.section}>
        <Text style={[styles.text, styles.bold]}>Gráfico Audiométrico</Text>
        <Text style={{ fontSize: 10, color: 'gray', fontStyle: 'italic' }}>[Gráfico Anexado via SVG/Canvas no sistema]</Text>
      </View>

      <View style={styles.reportBox}>
        <Text style={[styles.text, styles.bold]}>Parecer / Laudo Final:</Text>
        <Text style={styles.text}>{exam.finalReport}</Text>
      </View>

      <View style={styles.signature}>
        <Text style={styles.text}>{settings?.professionalName}</Text>
        <Text style={styles.text}>Fonoaudiólogo(a) - CRFa {settings?.crfaNumber}</Text>
      </View>
    </Page>
  </Document>
);
