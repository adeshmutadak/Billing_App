import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import RNPrint from 'react-native-print';
import { COLORS, FONTS, SIZES } from '../../utils/theme';
import ScreenHeader from '../../components/ScreenHeader';
import { useToast } from '../../components/Toast';
import {
  singleCustomerBillHtml,
  fetchPhotoDataUri,
} from '../../utils/billHtml';
import { photoSource } from '../../API/billHistory';

const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

const GenerateBill = ({ route }) => {
  const toast = useToast();
  const { customer, milkEntries } = route.params;

  // ================= TOTALS =================
  const totalAmount = milkEntries.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );
  const remainingAmount = Number(customer.remainingAmount || 0);

  // ================= HTML BUILDER =================
  // The markup lives in utils/billHtml, so this single bill and the print-all
  // batch on the home screen can never drift apart.
  // The photo is fetched and inlined first: a remote <img src> is often not
  // loaded by the time the print engine snapshots the page.
  const generateBillHTML = async () => {
    const photoDataUri = await fetchPhotoDataUri(customer.photoUrl);
    return singleCustomerBillHtml({
      customer: { ...customer, photoDataUri },
      entries: milkEntries,
      remainingAmount,
    });
  };

  // ================= DOWNLOAD / PRINT =================
  const downloadBill = async () => {
    try {
      await RNPrint.print({
        html: await generateBillHTML(),
        fileName: `Bill_${customer.name}`,
      });
    } catch (error) {
      console.log('PRINT ERROR:', error);
      toast.error('Failed to generate bill');
    }
  };

  // ================= SHARE =================
  const shareBill = async () => {
    try {
      await RNPrint.print({
        html: await generateBillHTML(),
        fileName: `Bill_${customer.name}`,
        jobName: 'Milk Bill',
      });
    } catch (error) {
      console.log('SHARE ERROR:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title="Bill" />

      <View style={styles.container}>

      {/* Customer Info */}
      <View style={styles.customerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.text}>📞 {customer.phoneNumber}</Text>
          <Text style={styles.text}>
            Cow Rate: ₹{customer.cowRate} | Buffalo Rate: ₹{customer.buffaloRate}
          </Text>
        </View>
        <Image
          source={photoSource(customer.photoUrl, defaultCustomerImg)}
          style={styles.photo}
        />
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.header}>Sr</Text>
        <Text style={styles.header}>Date</Text>
        <Text style={styles.header}>Cow L</Text>
        <Text style={styles.header}>Cow ₹</Text>
        <Text style={styles.header}>Buff L</Text>
        <Text style={styles.header}>Buff ₹</Text>
        <Text style={styles.header}>Total</Text>
      </View>

      {/* Rows. The only scrollable part: the customer block and the column
           header above, and the totals and buttons below, all stay put. */}
      <FlatList
        style={styles.rowsList}
        data={milkEntries}
        keyExtractor={(item, index) => String(item?.entryId ?? index)}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.noRows}>No entries for this bill</Text>
        }
        renderItem={({ item, index }) => (
        <View style={styles.tableRow}>
          <Text style={styles.cell}>{index + 1}</Text>
          <Text style={styles.cell}>{new Date(item.date).toLocaleDateString('en-GB')}</Text>
          <Text style={styles.cell}>{item.cowLitre}</Text>
          <Text style={styles.cell}>{item.cowRate}</Text>
          <Text style={styles.cell}>{item.buffaloLitre}</Text>
          <Text style={styles.cell}>{item.buffaloRate}</Text>
          <Text style={styles.totalCell}>₹ {item.totalAmount}</Text>
        </View>
        )}
      />

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLeft}>Remaining</Text>
          <Text style={styles.summaryRight}>₹ {remainingAmount}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryLine}>
          <Text style={styles.summaryLeft}>Grand Total</Text>
          <Text style={styles.summaryRight}>₹ {totalAmount}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.downloadBtn} onPress={downloadBill}>
          <Text style={styles.btnText}>⬇ Download PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={shareBill}>
          <Text style={styles.btnText}>📤 Share</Text>
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
};

export default GenerateBill;

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.padding,
  },
  rowsList: {
    // Takes whatever height is left between the fixed header above and the
    // totals below, so only the rows move.
    flex: 1,
  },
  noRows: {
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  billTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  text: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    marginTop: 10,
  },
  header: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  totalCell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  summaryRight: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  downloadBtn: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    padding: 12,
    borderRadius: 6,
    marginLeft: 5,
  },
  btnText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: FONTS.bold,
  },
});
