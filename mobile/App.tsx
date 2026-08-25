import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from './src/theme';

export default function App() {
  const [activeStep, setActiveStep] = useState<'home' | 'skinTone' | 'results'>('home');
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>('morena');

  const skinTones = [
    { id: 'clara', label: 'Clara', desc: 'Tons frios e neutros' },
    { id: 'morena', label: 'Morena Dourada', desc: 'Tons quentes e iluminados' },
    { id: 'parda', label: 'Parda', desc: 'Tons médios e profundos' },
    { id: 'negra', label: 'Negra Profunda', desc: 'Tons ricos e contrastantes' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0C10" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>TITI'S</Text>
        <Text style={styles.brandSubtitle}>CONSULTORIA DE IMAGEM</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeStep === 'home' && (
          <View style={styles.heroSection}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✨ ESTILO & AUTENTICIDADE</Text>
            </View>
            <Text style={styles.heroTitle}>Eleve sua Presença com Imagem Pessoal</Text>
            <Text style={styles.heroDescription}>
              Descubra looks perfeitamente alinhados ao seu tom de pele, ocasião e estilo único com a curadoria Titi's.
            </Text>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setActiveStep('skinTone')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Iniciar Consultoria Mobile →</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeStep === 'skinTone' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Escolha seu Tom de Pele</Text>
            <Text style={styles.sectionDesc}>Nossa inteligência cromática irá sugerir as cores ideais para você.</Text>

            {skinTones.map((tone) => (
              <TouchableOpacity
                key={tone.id}
                style={[
                  styles.optionCard,
                  selectedSkinTone === tone.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedSkinTone(tone.id)}
              >
                <View>
                  <Text style={styles.optionTitle}>{tone.label}</Text>
                  <Text style={styles.optionSub}>{tone.desc}</Text>
                </View>
                {selectedSkinTone === tone.id && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setActiveStep('results')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Ver Recomendações de Look →</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setActiveStep('home')}
            >
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeStep === 'results' && (
          <View style={styles.section}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>LOOKBOOK RECOMENDADO</Text>
            </View>
            <Text style={styles.sectionTitle}>Executivo Noir Gold</Text>
            <Text style={styles.sectionDesc}>Alfaiataria Slim em Lã Fria e Detalhes Champagne</Text>

            <View style={styles.lookCard}>
              <Text style={styles.cardHeaderTitle}>Peças Chave Recomendações:</Text>
              <Text style={styles.pieceItem}>• Blazer Slim Ajustado (Azul Marinho)</Text>
              <Text style={styles.pieceItem}>• Camisa Pima Cotton (Branco Marfim)</Text>
              <Text style={styles.pieceItem}>• Calça Alfaiataria (Cinza Chumbo)</Text>
              <Text style={styles.pieceItem}>• Loafer Couro Polido (Preto Absoluto)</Text>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setActiveStep('home')}
            >
              <Text style={styles.primaryButtonText}>Refazer Consultoria</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  brandTitle: {
    color: theme.colors.primaryGold,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  brandSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    paddingVertical: 20,
  },
  badge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: theme.colors.primaryGold,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    color: theme.colors.primaryGold,
    fontSize: 11,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    marginBottom: 12,
  },
  heroDescription: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: theme.colors.primaryGold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  primaryButtonText: {
    color: '#0B0C10',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  section: {
    paddingVertical: 10,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sectionDesc: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: theme.colors.primaryGold,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  optionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  checkMark: {
    color: theme.colors.primaryGold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  lookCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
  },
  cardHeaderTitle: {
    color: theme.colors.primaryGold,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pieceItem: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginVertical: 4,
  },
});
