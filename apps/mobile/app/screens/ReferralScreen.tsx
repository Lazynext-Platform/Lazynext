import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, TextInput, Alert } from 'react-native';

const API_BASE = "https://api.lazynext.com/api/v1";

export default function ReferralScreen() {
  const [balance, setBalance] = useState(0.00);
  const [referralLink, setReferralLink] = useState("Loading...");
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    // Fetch Wallet Balance
    fetch(`${API_BASE}/promotions/wallet`, {
      headers: { "Authorization": `Bearer placeholder_token` } // In real app, inject actual token
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setBalance(d.balance / 100);
      })
      .catch(console.error);

    // Fetch Referral Link
    fetch(`${API_BASE}/referrals/me`, {
      headers: { "Authorization": `Bearer placeholder_token` } // In real app, inject actual token
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setReferralLink(d.referral_link);
      })
      .catch(console.error);
  }, []);

  const handleShare = async () => {
    if (referralLink === "Loading...") return;
    try {
      await Share.share({
        message: `Check out Lazynext, the AI video editor! Sign up with my link and we both get $15 in credits: ${referralLink}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleApply = async () => {
    if (!code) return;
    setApplying(true);
    try {
      const res = await fetch(`${API_BASE}/promotions/apply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer placeholder_token` 
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Coupon applied successfully!");
        setBalance(prev => prev + (data.discount_applied / 100));
        setCode("");
      } else {
        Alert.alert("Error", data.error || "Failed to apply coupon");
      }
    } catch (e) {
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Refer & Earn</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wallet Balance</Text>
        <Text style={styles.balanceText}>${balance.toFixed(2)}</Text>
        <Text style={styles.subText}>Available to apply to your next billing cycle.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Referral Link</Text>
        <Text style={styles.linkText}>{referralLink}</Text>
        <TouchableOpacity style={styles.button} onPress={handleShare}>
          <Text style={styles.buttonText}>Share Link</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Apply Promo Code</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter discount code" 
          placeholderTextColor="#666"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleApply}
          disabled={applying || !code}
        >
          <Text style={styles.secondaryButtonText}>{applying ? "Applying..." : "Apply Code"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#888',
  },
  linkText: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
