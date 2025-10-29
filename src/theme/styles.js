import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { fonts } from './fonts';

export const styles = StyleSheet.create({
  /**
   * TYPOGRAPHY
   */
  brandTitle: { fontSize: 48, fontStyle: 'italic', fontWeight: fonts.weight.thick, color: colors.white, textAlign: 'center' },
  tagline: { fontSize: fonts.size.lg, color: colors.white, marginTop: 12, textAlign: 'center', lineHeight: 26, fontWeight: fonts.weight.regular },
  screenTitle: { fontSize: 24, fontWeight: fonts.weight.bold, color: colors.white },
  headerTitle: { fontSize: fonts.size.lg, fontWeight: fonts.weight.bold, color: colors.white },
  itemTitle: { marginTop: 8, fontWeight: fonts.weight.regular, color: colors.navy },
  itemDescription: { color: colors.gray500, fontSize: fonts.size.xs },
  label: { fontWeight: fonts.weight.bold, color: colors.white, marginBottom: 6 },
  body: { color: colors.white },
  error: { color: colors.yellow, marginBottom: 16, fontWeight: fonts.weight.regular },
  value: { color: colors.white, fontWeight: fonts.weight.thick },
  price: { color: colors.yellow, fontWeight: fonts.weight.thick },

  /**
   * CONTAINERS & LAYOUT
   */
  container: { flexGrow: 1, padding: 16, gap: 8 },
  containerBackground: { flexGrow: 1, padding: 16, backgroundColor: colors.navy, gap: 8 },
  centered: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  /**
   * =============================================
   * HEADER
   * =============================================
   */
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navy, paddingHorizontal: 16, height: 100 },
  headerLeftContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  headerRightContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  headerCenter: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center', justifyContent: 'center' }, 

  /**
   * =============================================
   * SEARCH & FILTERS
   * =============================================
   */
  headerPanel: { padding: 12, backgroundColor: colors.navy },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.white },
  searchInput: { flex: 1, color: colors.white, fontSize: fonts.size.sm },
  filterPanel: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.white },
  textButton: { paddingVertical: 8, alignSelf: 'flex-start' },
  textButtonText: { color: colors.white, textDecorationLine: 'underline' },

  /**
   * =============================================
   * ITEM CARD (For browsing lists)
   * =============================================
   */
  cardContainer: { marginBottom: 16 },
  cardImageContainer: { aspectRatio: 1, width: '100%', borderRadius: 6, overflow: 'hidden', backgroundColor: colors.lightBackground },
  cardContent: { padding: 8 },
  cardTitle: { fontWeight: fonts.weight.regular, color: colors.navy, fontSize: fonts.size.md },
  cardDescription: { color: colors.gray500, fontSize: fonts.size.xs, marginTop: 2 },
  cardPrice: { marginTop: 4, fontSize: fonts.size.xs, fontWeight: 'bold', color: colors.navy },
  cardActionsOverlay: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 },

  /**
   * BUTTONS & ACTIONS
   */
  iconButtonSolid: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  iconButtonTransparent: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  
  /**
   * =============================================
   * LIST ITEMS (For Wishlist, Basket, etc.)
   * =============================================
   */
  listItemContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8 },
  listItemImage: { width: 72, height: 72, borderRadius: 8 },
  listItemContent: { flex: 1 },
  listItemTitle: { color: colors.white, fontWeight: fonts.weight.regular, fontSize: fonts.size.md },
  listItemActions: { flexDirection: 'row', gap: 8 },

  /**
   * INPUTS & FORMS
   */
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 12, color: colors.black },
  searchAndFilterContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 0, gap: 8 },

  /**
   * IMAGES & AVATARS
   */
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.white },
  thumbnail: { width: 72, height: 72, borderRadius: 8 },
  carouselImage: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.lightBackground },

  /**
   * CHIPS & DOTS
   */
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.yellow },
  chipText: { color: colors.lightNavy },
  chipTextActive: { color: colors.black },
  dotsRow: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot },
  dotActive: { backgroundColor: colors.white },
});