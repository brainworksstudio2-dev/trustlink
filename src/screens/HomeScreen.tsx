import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Image, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../lib/supabase';

type HomeScreenProps = {
  navigation: any;
};

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', name: 'Electrician', icon: 'flash', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1rKq8Ve46VH1pkigpwiU9sof1cy1nGd6Vg26_TzX1hjFMDIuLp2aRHh4xxX07SsUqFc71B-NwZeMCWbo8d_UzAjAq6j92VMkFYmzCQTBep6bzShF7gtHEp6hQoNbGL86BzHqT5gXiG5D8EUZG_BGrljHemfySy5CbBTLmZvFAMmRi2d9ScHMJ19Z4OPXFzOz1IBas4OfCJhDMkI89w2yzKQ22iCuAnwaWe21vTVQ2STAh6frjnpXDzU4ZlMVD8AR97hbUjOxdRhA' },
  { id: '2', name: 'Photographer', icon: 'camera', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeMfKFjBb4MHClJcS5rBQ5g-ri8X6t47FtjidaSgsgpAqbupxDOoc4z6XDK-jEA2g9mSe4at9zDlwjPicv6N9DzcD28XjUtKwB6-JIem2KFU5EaD4yQ9zCR_wZpzx9zJyl2d6yGzF1O7Ji55F2ClpkRG1Qdz17RdaVa2YqHwSv74Hcb6prXebuvhxjtouSyKu6Aut4tJli4K9XaLoJrT5Q0BPKGUjP4bi_PC2hyV4TFCA0_SOOjmJ07F0d4HsDGDv9r23qQU1EO00' },
  { id: '3', name: 'Barber', icon: 'cut', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0lsalsyZElkf-DGsc-zMy4TPpdBDhZWSBE9wv_ytQP57Fe10XLuT67a0JN56N8JNNZWqRLmdKI6pyN_WvRrz11hf1Cea0N4pDFO0mLJ77WiwRG4NH1BrmUUpdNGjOZwimGIfcV_6zQdtv7VVP2zJ_yguASry3UEWm9LvmSvAW8D4FlU8F0zsdkUVv3q5WXK29l7HGU_gchFq0ztqpBE2GGjlCCf4Myh7oGxZfplrj7I0bYBEcuVMQninIbzR0tv6kSNaYS4XYeoo' },
  { id: '4', name: 'Mechanic', icon: 'car', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAVISaQyXmkqWnvTGPDsVv0dNQMVY3DiEDobcubMFWpnfquhwp_Zk1BwOqyzzbyXKwufu4YPZ_6j6Ug0IbdZSj3vT2ZWC4mWahaZWvAM_0s0vHSwgTxc9563VklyN5C62j5T6dvNStGKEaqffCIgdFJhNpGgbKQikEzRORuxxMUtl7COP26urNUWcl5oDbZecc7NdL5SI_6uL0OAeQdq8CICE1yazf7Cgfy_gle4kLn2uP6zDX7GObA2QExDVv0RgCqwgQGuAM0YY' },
  { id: '5', name: 'Cleaner', icon: 'sparkles', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjJc-P-lx3dpURVIkYQTRIZGzpHoT7_kYUbTLbkaIvsKa_el1-iSpomNY3PXXdlqkjJNmuz-HGFcHr8axikzBNMeR0SV02sIkki0eWUTNwmt4Kz46jtrYqVOhqNXMSOzGIGvIyH0eBaVDRA0DwEv0OBw255x82EFjycO_oy4iOfRzWnWNTrZ3xCH9R-0AyhicDYbFBca4wDoxBwzpTlXOrz7bdpHNyhtuc8nJE-a9oS-ew2GPKcyDUBknNhW7XLMrEsutAo4z0RuU' },
  { id: '6', name: 'Makeup Artist', icon: 'brush', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlp4BWgxox8DKLL1sHq8rNSvOuTCVXq6sqcCs3DBPERO96pUU8nBHohHkcjue0N3cYWjUPlu90h3BqSF-7cGxyWUz5Ruj68g9TNXpdFoGWZiH9HT_vBlf-gnF-teyg-VELGyJpDmqROy28HJGkjY4Fg9buDbbgUHEJeVXhZPIohARLcfdl9cJYoCF2l1CD-fN_4QuPidUhPOJ291qia5W5kI2fvCIZPoTzuKFlaQeeA73DaNWgg_afmNU5LBFJ_L_Q6mFkpiRzWyE' },
  { id: '7', name: 'Tutor', icon: 'book', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZ0FUUXhGC9q7-8ldaVkM0lELMC_k7ilVtuA_gkvFwQ3S5nRQZ73-do_luTyLTKarEYgJzwCulx6mk8vLc2mXlCvaCLdKX1ijZNGY8S6fknpSUwZGYKFWoc0SWFlkME9ZuMVhzc-wKWiFRMC-viJDWzxmLEpSZZvsZbab_nD6mwDM5JaAJABmVYssyvIiFBn8ahzLPqewIYedVAPmwVo-Jut7Xo29ihNwxg5DjynDbFUPvFeCA4a3E47CdxxsAdzGxcup0cPiGmyI' },
  { id: '8', name: 'Carpenter', icon: 'hammer', uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjRxtC23L5brQbobuF9zQfy3Ubed4g1OWs8rOiDNqhDTrrcqbMV84IDNNe5JR255nSuM9SqtJAwbjW1dxRTYbLpK4kNesypcSjHRLgxpqezrRaic016WantNaKPw3mM1GJHUxuj3y9vmlktkkh2AZRbjWQQ3P_Fqv1Yda-U66sulBzKtpRPZGq0n_bIT_VTrwkcduFa0FUls4d9vaEnSo0KnRon3q6-nJ1LjsiXcS26UQd-QEM1JAw90_rL3WBVDTCVmR_COeALk0' },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.full_name) {
        const firstName = session.user.user_metadata.full_name.split(' ')[0];
        setUserName(firstName);
      }
    });
  }, []);

  const handleCategoryPress = (category: string) => {
    // Navigate to Explore tab and filter there
    navigation.navigate('Explore');
  };

  const handleFindNearby = () => {
    navigation.navigate('Explore');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning, {userName || 'Guest'}</Text>
          <Text style={styles.subGreeting}>Find a reliable professional for your home today.</Text>
        </View>

        {/* Custom Search Bar */}
        <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
          <Ionicons name="search" size={20} color={isFocused ? Colors.primary : Colors.outline} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="What service do you need?"
            placeholderTextColor={Colors.outline}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={Colors.outline} />
            </TouchableOpacity>
          )}
        </View>

        {/* Bento Grid Service Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Service Categories</Text>
          <View style={styles.grid}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => handleCategoryPress(item.name)}
              >
                <View style={styles.cardImageContainer}>
                  <Image source={{ uri: item.uri }} style={styles.cardImage} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardText}>{item.name}</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Promotion / Trust Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Verified Professionals</Text>
            <Text style={styles.bannerDesc}>
              Every service provider on TrustLink goes through a rigorous identity and skill verification process. Hire with total confidence.
            </Text>
          </View>
          <View style={styles.goldBadge}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.gold} />
            <Text style={styles.goldBadgeText}>Trust Certified</Text>
          </View>
        </View>
      </ScrollView>

      {/* FAB CTA Button */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.9}
        onPress={handleFindNearby}
      >
        <Ionicons name="navigate" size={18} color={Colors.onPrimary} />
        <Text style={styles.fabText}>Find Nearby Workers</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: Spacing.containerMobile,
    paddingTop: Spacing.md,
    paddingBottom: 100, // room for floating action button
  },
  header: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.headlineMd,
    color: Colors.onBackground,
    fontWeight: '800',
  },
  subGreeting: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '66',
    paddingHorizontal: Spacing.md,
    height: 56,
    ...Shadow.card,
    marginBottom: Spacing.xl,
  },
  searchContainerFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...Typography.bodyLg,
    color: Colors.onSurface,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  categoriesSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  card: {
    width: (width - Spacing.containerMobile * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '22',
    ...Shadow.card,
  },
  cardImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.surfaceContainerLow,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  cardText: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: Colors.primaryContainer + '10',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryContainer + '20',
    padding: Spacing.lg,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...Typography.headlineSm,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 6,
  },
  bannerDesc: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  goldBadgeText: {
    ...Typography.labelMd,
    color: Colors.gold,
    fontWeight: '700',
    marginLeft: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadow.modal,
    gap: 8,
    zIndex: 50,
  },
  fabText: {
    ...Typography.labelMd,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
});
