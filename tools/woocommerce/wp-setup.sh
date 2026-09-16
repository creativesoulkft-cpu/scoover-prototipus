#!/usr/bin/env bash
# WordPress + WooCommerce beállítás magyar webáruházhoz, egy menetben.
#
# Hol futtasd: a Forpsi tárhely SSH-ján, a weboldal gyökérkönyvtárában
# (ahol a wp-config.php van vagy lesz), például:
#     ssh <felhasznalo>@<szerver>
#     cd ~/web/elektromos-roller.net
#     bash wp-setup.sh
#
# Mit csinál: WP-CLI letöltés, magyar nyelv, időzóna, hivatkozás-szerkezet,
# WooCommerce telepítés, HUF + 27% ÁFA, magyar pluginok, és legvégül
# létrehoz egy WooCommerce REST API kulcsot, amivel a termékimport megy.
#
# Újrafuttatható: ami már kész, azt kihagyja.

set -uo pipefail

SITE_URL="${SITE_URL:-https://www.elektromos-roller.net}"
SITE_TITLE="${SITE_TITLE:-Whoosh – Elektromos Roller Szaküzlet}"
ADMIN_USER="${ADMIN_USER:-whoosh}"
ADMIN_EMAIL="${ADMIN_EMAIL:-eroller@elektromosroller.net}"
STORE_CITY="${STORE_CITY:-Veszprém}"
STORE_POSTCODE="${STORE_POSTCODE:-8200}"
STORE_ADDRESS="${STORE_ADDRESS:-}"

WP="php wp-cli.phar --no-color"
say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m    FIGYELEM: %s\033[0m\n' "$*"; }

# ---------- 0. WP-CLI ----------
if [ ! -f wp-cli.phar ]; then
  say "WP-CLI letöltése"
  curl -sSL -o wp-cli.phar https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    || wget -qO wp-cli.phar https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
fi
php wp-cli.phar --info >/dev/null 2>&1 || { echo "A WP-CLI nem fut. Ellenőrizd, hogy van-e php a parancssorban: php -v"; exit 1; }

# ---------- 1. WordPress ----------
if ! $WP core is-installed >/dev/null 2>&1; then
  if [ ! -f wp-config.php ]; then
    cat <<'MSG'

  Nincs wp-config.php ebben a mappában.

  Két lehetőség:
   a) A Forpsi adminban a Softaculous telepítővel tedd fel a WordPress-t erre a
      domainre, aztán futtasd újra ezt a scriptet ugyanebben a mappában.
   b) Kézzel: hozz létre egy MySQL adatbázist a Forpsi adminban, majd:
        php wp-cli.phar core download --locale=hu_HU
        php wp-cli.phar config create --dbname=... --dbuser=... --dbpass=... --dbhost=...
        php wp-cli.phar core install --url=... --title=... --admin_user=... --admin_email=...

MSG
    exit 1
  fi
  say "WordPress telepítése"
  $WP core install --url="$SITE_URL" --title="$SITE_TITLE" --admin_user="$ADMIN_USER" --admin_email="$ADMIN_EMAIL" --skip-email
fi

say "Magyar nyelv, időzóna, alapbeállítások"
$WP language core install hu_HU --activate 2>/dev/null
$WP option update timezone_string 'Europe/Budapest'
$WP option update date_format 'Y. F j.'
$WP option update time_format 'H:i'
$WP option update start_of_week 1
$WP option update blogdescription 'Elektromos roller eladás, bérlés, szerviz, alkatrész – Veszprém'
$WP rewrite structure '/%postname%/' --hard
$WP option update blog_public 1

# ---------- 2. WooCommerce ----------
say "WooCommerce telepítése"
$WP plugin is-installed woocommerce >/dev/null 2>&1 || $WP plugin install woocommerce
$WP plugin activate woocommerce

say "Pénznem, ÁFA, bolt adatai"
$WP option update woocommerce_currency 'HUF'
$WP option update woocommerce_currency_pos 'right_space'
$WP option update woocommerce_price_thousand_sep ' '
$WP option update woocommerce_price_decimal_sep ','
$WP option update woocommerce_price_num_decimals 0
$WP option update woocommerce_default_country 'HU:VE'
$WP option update woocommerce_store_city "$STORE_CITY"
$WP option update woocommerce_store_postcode "$STORE_POSTCODE"
[ -n "$STORE_ADDRESS" ] && $WP option update woocommerce_store_address "$STORE_ADDRESS"
$WP option update woocommerce_allowed_countries 'specific'
$WP option update woocommerce_specific_allowed_countries '["HU"]' --format=json
$WP option update woocommerce_weight_unit 'kg'
$WP option update woocommerce_dimension_unit 'cm'
$WP option update woocommerce_manage_stock 'yes'
$WP option update woocommerce_enable_reviews 'yes'

# ÁFA: az árakat bruttóban visszük fel, ezt a wc-import.mjs --price=gross is így küldi.
$WP option update woocommerce_calc_taxes 'yes'
$WP option update woocommerce_prices_include_tax 'yes'
$WP option update woocommerce_tax_based_on 'base'
$WP option update woocommerce_tax_display_shop 'incl'
$WP option update woocommerce_tax_display_cart 'incl'

say "27%-os ÁFA-kulcs felvétele"
$WP eval '
if ( ! class_exists( "WC_Tax" ) ) { echo "    A WooCommerce nem tolt be.\n"; return; }
$van = false;
foreach ( WC_Tax::get_rates_for_tax_class( "" ) as $r ) { if ( (float) $r->tax_rate === 27.0 ) { $van = true; } }
if ( $van ) { echo "    A 27%-os kulcs mar letezik.\n"; }
else {
  WC_Tax::_insert_tax_rate( array(
    "tax_rate_country" => "HU", "tax_rate_state" => "", "tax_rate" => "27.0000",
    "tax_rate_name" => "AFA", "tax_rate_priority" => 1, "tax_rate_compound" => 0,
    "tax_rate_shipping" => 1, "tax_rate_order" => 0, "tax_rate_class" => "",
  ) );
  echo "    27%-os AFA-kulcs felveve.\n";
}'

# A termék-útvonalaknak egyezniük kell a wc-import.mjs redirects parancsával.
say "Termék-útvonalak beállítása (/termek/ és /termekkategoria/)"
$WP option update woocommerce_permalinks '{"product_base":"/termek","category_base":"termekkategoria","tag_base":"termek-cimke","attribute_base":""}' --format=json
$WP rewrite flush --hard

# ---------- 3. Pluginok ----------
say "Pluginok telepítése"
# Ellenőrzött slugok a wordpress.org könyvtárából.
for p in \
  surbma-magyar-woocommerce \
  integration-for-szamlazzhu-woocommerce \
  pay-via-barion-for-woocommerce \
  hungarian-pickup-points-for-woocommerce \
  redirection \
  seo-by-rank-math \
  wp-super-cache \
  loco-translate
do
  if $WP plugin is-installed "$p" >/dev/null 2>&1; then
    echo "    $p – már telepítve"
  else
    $WP plugin install "$p" --activate && echo "    $p – kész" || warn "$p telepítése nem sikerült"
  fi
done

say "Sablon telepítése"
$WP theme is-installed astra >/dev/null 2>&1 || $WP theme install astra
$WP theme activate astra

say "Fordítások frissítése"
$WP language plugin update --all 2>/dev/null
$WP language theme update --all 2>/dev/null

# ---------- 4. REST API kulcs a termékimporthoz ----------
say "WooCommerce REST API kulcs létrehozása"
$WP eval '
global $wpdb;
$user = get_user_by( "login", "'"$ADMIN_USER"'" );
if ( ! $user ) { $admins = get_users( array( "role" => "administrator", "number" => 1 ) ); $user = $admins ? $admins[0] : null; }
if ( ! $user ) { echo "    Nincs adminisztrator felhasznalo.\n"; return; }
$tabla = $wpdb->prefix . "woocommerce_api_keys";
$regi = $wpdb->get_var( $wpdb->prepare( "SELECT key_id FROM {$tabla} WHERE description = %s", "Termekimport (Claude)" ) );
if ( $regi ) { $wpdb->delete( $tabla, array( "key_id" => $regi ) ); }
$ck = "ck_" . wc_rand_hash();
$cs = "cs_" . wc_rand_hash();
$wpdb->insert( $tabla, array(
  "user_id" => $user->ID, "description" => "Termekimport (Claude)",
  "permissions" => "read_write", "consumer_key" => wc_api_hash( $ck ),
  "consumer_secret" => $cs, "truncated_key" => substr( $ck, -7 ),
) );
echo "\n    WC_URL=" . untrailingslashit( home_url() ) . "\n";
echo "    WC_KEY=" . $ck . "\n";
echo "    WC_SECRET=" . $cs . "\n";
'

cat <<'VEGE'

==> Kész.

  A fenti három sort (WC_URL, WC_KEY, WC_SECRET) másold be a Claude Code
  környezeti változói közé. A kulcs csak most látszik, később nem kérhető le,
  de ez a script újrafuttatva újat készít.

  Ami még kézi munka, mert fiók kell hozzá:
    - Barion vagy SimplePay: a szolgáltatónál kell szerződés, utána a plugin
      beállításaiban az azonosítók. A SimplePay plugint az OTP oldaláról kell
      letölteni, nincs a WordPress könyvtárában.
    - Számlázz.hu: Agent kulcs a Számlázz.hu fiókból.
    - Csomagpontok: GLS, Foxpost, Packeta ügyfélazonosítók.

VEGE
