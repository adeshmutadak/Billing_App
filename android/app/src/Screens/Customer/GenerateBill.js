import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import RNPrint from 'react-native-print';
import { COLORS, FONTS, SIZES } from '../../utils/theme';

const defaultCustomerImg = require('../../Assets/Images/logo.jpg');

const GenerateBill = ({ route }) => {
  const { customer, milkEntries } = route.params;

  // ================= TOTALS =================
  const totalAmount = milkEntries.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );
  const remainingAmount = Number(customer.remainingAmount || 0);

  // ================= HTML BUILDER =================
  const generateBillHTML = () => {
    const invoiceNo = `INV-${Date.now()}`;
    const billDate = new Date().toLocaleDateString('en-GB');

    const rows = milkEntries
      .map(
        (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${new Date(item.date).toLocaleDateString('en-GB')}</td>
        <td>${item.cowLitre}</td>
        <td>${item.cowRate}</td>
        <td>${item.buffaloLitre}</td>
        <td>${item.buffaloRate}</td>
        <td>₹ ${item.totalAmount}</td>
      </tr>`
      )
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial; font-size: 10px; padding: 10px; position: relative; }
            table { border-collapse: collapse; width: 100%; margin-top: 5px; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; }
            h2, h3, h4, p { margin: 2px 0; }
            .header { text-align: center; }
            .right { text-align: right; }
            .small { font-size: 9px; }
            .logo { 
              position: absolute; 
              top: 10px; 
              right: 10px; 
              width: 60px; 
              height: 60px; 
              border-radius: 30px; 
              object-fit: cover;
            }
          </style>
        </head>
        <body>
          ${customer.logoBase64 ? `<img src="data:image/png;base64,${customer.logoBase64}" class="logo"/>` : ''}

          <div class="header">
            <h2>MILK BILL</h2>
            <h4 class="small">Invoice: ${invoiceNo} | Date: ${billDate}</h4>
          </div>

          <p><b>Customer:</b> ${customer.name}</p>
          <p><b>Phone:</b> ${customer.phoneNumber}</p>
          <p><b>Rates:</b> Cow ₹${customer.cowRate}, Buffalo ₹${customer.buffaloRate}</p>

          <table>
            <tr>
              <th>Sr</th>
              <th>Date</th>
              <th>Cow L</th>
              <th>Cow ₹</th>
              <th>Buff L</th>
              <th>Buff ₹</th>
              <th>Total</th>
            </tr>
            ${rows}
          </table>

          <h4 class="right">Remaining: ₹ ${remainingAmount}</h4>
          <h3 class="right">Grand Total: ₹ ${totalAmount}</h3>

          <p class="small" style="text-align:center;">Thank you for your business!</p>
        </body>
      </html>
    `;
  };

  // ================= DOWNLOAD / PRINT =================
  const downloadBill = async () => {
    try {
      await RNPrint.print({
        html: generateBillHTML(),
        fileName: `Bill_${customer.name}`,
      });
    } catch (error) {
      console.log('PRINT ERROR:', error);
      Alert.alert('Error', 'Failed to generate bill');
    }
  };

  // ================= SHARE =================
  const shareBill = async () => {
    try {
      await RNPrint.print({
        html: generateBillHTML(),
        fileName: `Bill_${customer.name}`,
        jobName: 'Milk Bill',
      });
    } catch (error) {
      console.log('SHARE ERROR:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.billTitle}>BILL</Text>

      {/* Customer Info */}
      <View style={styles.customerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{customer.name}</Text>
          <Text style={styles.text}>📞 {customer.phoneNumber}</Text>
          <Text style={styles.text}>
            Cow Rate: ₹{customer.cowRate} | Buffalo Rate: ₹{customer.buffaloRate}
          </Text>
        </View>
        <Image source={defaultCustomerImg} style={styles.photo} />
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

      {/* Rows */}
      {milkEntries.map((item, index) => (
        <View key={item.entryId || index} style={styles.tableRow}>
          <Text style={styles.cell}>{index + 1}</Text>
          <Text style={styles.cell}>{new Date(item.date).toLocaleDateString('en-GB')}</Text>
          <Text style={styles.cell}>{item.cowLitre}</Text>
          <Text style={styles.cell}>{item.cowRate}</Text>
          <Text style={styles.cell}>{item.buffaloLitre}</Text>
          <Text style={styles.cell}>{item.buffaloRate}</Text>
          <Text style={styles.totalCell}>₹ {item.totalAmount}</Text>
        </View>
      ))}

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
    </ScrollView>
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
