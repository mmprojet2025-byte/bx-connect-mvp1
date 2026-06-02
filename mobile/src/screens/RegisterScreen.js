import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({ prenom:'', nom:'', email:'', motDePasse:'', confirmation:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!form.prenom.trim()||!form.nom.trim()||!form.email.trim()||!form.motDePasse.trim()) {
      setError(t('auth.error_required')); return;
    }
    if (form.motDePasse !== form.confirmation) { setError(t('auth.error_passwords')); return; }
    if (form.motDePasse.length < 8) { setError(t('auth.error_password_min')); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        prenom: form.prenom.trim(), nom: form.nom.trim(),
        email: form.email.trim(), motDePasse: form.motDePasse,
      });
      const { token, prenom, nom, email, role } = res.data;
      await login(token, { prenom, nom, email, role });
    } catch (err) {
      setError(getApiError(err, t('auth.error_register'), t));
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.logo}>BX-CONNECT</Text>
        <Text style={styles.subtitle}>{t('auth.register_subtitle')}</Text>
      </View>
      {error !== '' && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.field,{flex:1,marginRight:8}]}>
            <Text style={styles.label}>{t('auth.firstname')} *</Text>
            <TextInput style={styles.input} value={form.prenom} onChangeText={v=>setForm({...form,prenom:v})} autoCapitalize="words"/>
          </View>
          <View style={[styles.field,{flex:1}]}>
            <Text style={styles.label}>{t('auth.lastname')} *</Text>
            <TextInput style={styles.input} value={form.nom} onChangeText={v=>setForm({...form,nom:v})} autoCapitalize="words"/>
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.email')} *</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={v=>setForm({...form,email:v})} keyboardType="email-address" autoCapitalize="none" placeholder={t('auth.email_placeholder')} placeholderTextColor="#94a3b8"/>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.password_min_label')}</Text>
          <TextInput style={styles.input} value={form.motDePasse} onChangeText={v=>setForm({...form,motDePasse:v})} secureTextEntry autoCapitalize="none" placeholder={t('auth.password_placeholder')} placeholderTextColor="#94a3b8"/>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.confirm_password')} *</Text>
          <TextInput style={styles.input} value={form.confirmation} onChangeText={v=>setForm({...form,confirmation:v})} secureTextEntry autoCapitalize="none" placeholder={t('auth.confirm_password')} placeholderTextColor="#94a3b8"/>
        </View>
        <TouchableOpacity style={[styles.btn,loading&&styles.btnDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>{t('auth.register_btn')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={()=>navigation.navigate('Login')}>
          <Text style={styles.linkText}>{t('auth.already_account')}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.back} onPress={()=>navigation.navigate('Home')}>
        <Text style={styles.backText}>{t('auth.back_home_short')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getApiError(err, fallback, t) {
  if (err.response?.status === 403) return t('errors.forbidden');
  const message = err.response?.data?.message?.toLowerCase() || '';
  if (message.includes('existe')) return t('auth.error_email_exists');
  return fallback;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f0f4f8'},
  content:{paddingHorizontal:20,paddingTop:32,paddingBottom:40},
  header:{alignItems:'center',marginBottom:24},
  logo:{fontSize:26,fontWeight:'bold',color:'#1e3a5f',letterSpacing:1},
  subtitle:{fontSize:14,color:'#64748b',marginTop:4},
  card:{backgroundColor:'#fff',borderRadius:20,padding:24,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:12,elevation:3},
  errorBox:{backgroundColor:'#fef2f2',borderWidth:1,borderColor:'#fecaca',borderRadius:12,padding:12,marginBottom:16},
  errorText:{color:'#dc2626',fontSize:13},
  row:{flexDirection:'row',marginBottom:0},
  field:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#374151',marginBottom:6},
  input:{borderWidth:1,borderColor:'#d1d5db',borderRadius:12,paddingHorizontal:16,paddingVertical:12,fontSize:15,color:'#1e293b',backgroundColor:'#f8fafc'},
  btn:{backgroundColor:'#1e3a5f',paddingVertical:14,borderRadius:12,alignItems:'center',marginTop:8},
  btnDisabled:{backgroundColor:'#94a3b8'},
  btnText:{color:'#fff',fontWeight:'bold',fontSize:16},
  link:{marginTop:16,alignItems:'center'},
  linkText:{color:'#2563eb',fontSize:13},
  back:{marginTop:20,alignItems:'center'},
  backText:{color:'#64748b',fontSize:13},
});
