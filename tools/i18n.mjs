// Génère la version anglaise à partir des pages françaises (la source) : node tools/i18n.mjs
// À chaque build ; toute phrase française non traduite est signalée.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const SERVICES = [['Chauffage central', 'Central heating'], ['Climatisation', 'Air conditioning'], ['Gaz', 'Gas'], ['Sanitaire', 'Plumbing'], ['Ventilation', 'Ventilation']]

const T = [
  // En-tête de page
  ['<html lang="fr-BE">', '<html lang="en">'],
  ['ECO-CHAUFFE | Chauffagiste à Quaregnon, région de Mons-Borinage', 'ECO-CHAUFFE | Heating engineer in Quaregnon, Mons-Borinage region'],
  ['ECO-CHAUFFE, à Quaregnon depuis 2016 : chauffage, ventilation, climatisation (CVC), gaz, sanitaire et installation de systèmes thermiques dans la région de Mons-Borinage.', 'ECO-CHAUFFE, based in Quaregnon since 2016: heating, ventilation, air conditioning (HVAC), gas, plumbing and thermal system installation in the Mons-Borinage region.'],
  ['"description":"Chauffage, ventilation, climatisation (CVC) et installation de systèmes thermiques"', '"description":"Heating, ventilation, air conditioning (HVAC) and thermal system installation"'],
  ['"areaServed":"Région de Mons-Borinage"', '"areaServed":"Mons-Borinage region"'],
  ['"knowsAbout":["Chauffage central","Climatisation","Ventilation","Gaz","Sanitaire"]', '"knowsAbout":["Central heating","Air conditioning","Ventilation","Gas","Plumbing"]'],
  ['lang=fr&amp;ondernemingsnummer', 'lang=en&amp;ondernemingsnummer'],

  // Accessibilité
  ['ECO-CHAUFFE, retour en haut', 'ECO-CHAUFFE, back to top'],
  ['Navigation principale', 'Main navigation'],
  ['Ouvrir le menu', 'Open menu'],
  ['aria-label="Accueil"', 'aria-label="Home"'],
  ['Preuve précédente', 'Previous proof'],
  ['Preuve suivante', 'Next proof'],
  ['Informations légales', 'Legal information'],
  ['Détail du service', 'Service details'],
  ['Service précédent', 'Previous service'],
  ['aria-label="Service suivant"', 'aria-label="Next service"'],
  ['aria-label="Fermer"', 'aria-label="Close"'],
  ['Actions rapides', 'Quick actions'],
  ['ECO-CHAUFFE, accueil', 'ECO-CHAUFFE, home'],

  // Textes de remplacement des images
  ['Technicien contrôlant une unité extérieure à la lampe', 'Technician checking an outdoor unit with a torch'],
  ['Mains gantées serrant un raccord à la clé', 'Gloved hands tightening a fitting with a spanner'],
  ['Mains gantées réglant une chaudière', 'Gloved hands adjusting a boiler'],
  ['Technicien lisant ses manomètres', 'Technician reading pressure gauges'],
  ['Manomètre et vanne orange sur un circuit', 'Pressure gauge and orange valve on a circuit'],
  ['Raccordement de tuyaux', 'Pipe connection'],
  ['Unité extérieure contre un mur', 'Outdoor unit against a wall'],
  ['Artisan en gilet de sécurité, clé à la main', 'Tradesperson in a safety vest holding a wrench'],
  ['Artisan purgeant un radiateur en fonte', 'Tradesman bleeding a cast-iron radiator'],
  ['Unité extérieure devant une façade moderne', 'Outdoor unit in front of a modern façade'],
  ['Raccord de tuyaux isolés', 'Insulated pipe fitting'],
  ['Salon chaleureux au coin du feu', 'Cosy living room by the fire'],
  ['Artisane en gilet orange, clé serre-tube à la main', 'Tradeswoman in an orange vest holding a pipe wrench'],
  ['Main réglant le robinet thermostatique d\'un radiateur', 'Hand adjusting a radiator’s thermostatic valve'],
  ['Pièce à vivre chaleureuse et bien chauffée', 'Warm, well-heated living space'],

  // Héros
  ['aria-label="Plus de chaleur, moins d\'énergie."', 'aria-label="More warmth, less energy."'],
  ['Plus de <span class="morph" data-from="300" data-to="900">chaleur,</span>', 'More <span class="morph" data-from="300" data-to="900">warmth,</span>'],
  ['moins d’<span class="morph" data-from="800" data-to="200">énergie.</span>', 'less <span class="morph" data-from="800" data-to="200">energy.</span>'],
  ['>Chauffage<', '>Heating<'],
  ['Découvrir', 'Discover'],
  ['<span class="r-top">Depuis</span>', '<span class="r-top">Since</span>'],
  ['Faites défiler', 'Scroll down'],
  ['<span>12,0</span>', '<span>12.0</span>'],

  // Navigation et boutons
  ['>En images<', '>Gallery<'],
  ['<i></i>En images<', '<i></i>Gallery<'],
  ['>Méthode<', '>Process<'],
  ['<i></i>Méthode<', '<i></i>Process<'],
  ['Demander un devis', 'Request a quote'],

  // Intro
  ['Notre métier', 'Our trade'],
  ['Une chaleur <span class="pill-flow" aria-hidden="true"></span> juste, pour la maison comme pour le bureau.', 'The right <span class="pill-flow" aria-hidden="true"></span> warmth, for homes and offices alike.'],
  ['Depuis 2016', 'Since 2016'],
  ['Ans de métier', 'Years active'],
  ['Nous parler', 'Talk to us'],

  // Services
  ['CVC et systèmes thermiques', 'HVAC and thermal systems'],
  ['Tout ce qui <em>chauffe.</em>', 'Everything that <em>heats.</em>'],
  ['Voir <i></i>', 'View <i></i>'],

  // Confiance
  ['Entreprise fondée en 2016 par Youssef Garziad.', 'Business founded in 2016 by Youssef Garziad.'],
  ['<small>compétences</small>', '<small>qualifications</small>'],
  ['Un métier <em>reconnu.</em>', 'A recognised <em>trade.</em>'],
  ['>Création<', '>Founded<'],
  ['Ans d’activité', 'Years active'],
  ['>Compétences<', '>Qualifications<'],

  // En images
  ['Du chantier <em>au confort.</em>', 'From job site <em>to comfort.</em>'],
  ['Le résultat', 'The result'],
  ['Votre projet', 'Your project'],

  // Méthode
  ['Un degré <em>à la fois.</em>', 'One degree <em>at a time.</em>'],
  ['<h3>Visite</h3><p>On mesure, on écoute.</p>', '<h3>Visit</h3><p>We measure, we listen.</p>'],
  ['<h3>Devis</h3><p>Clair, sans surprise.</p>', '<h3>Quote</h3><p>Clear, no surprises.</p>'],
  ['<h3>Pose</h3><p>Soignée, puis réglée.</p>', '<h3>Install</h3><p>Careful, then fine-tuned.</p>'],
  ['<h3>Suivi</h3><p>On reste joignable.</p>', '<h3>Follow-up</h3><p>We stay reachable.</p>'],

  // Image thermique
  ['aria-label="Chaque degré compte."', 'aria-label="Every degree counts."'],
  ['Chaque degré</span>', 'Every degree</span>'],
  ['<em aria-hidden="true">compte.</em>', '<em aria-hidden="true">counts.</em>'],

  // Atouts
  ['Pourquoi nous', 'Why us'],
  ['Moins de pertes, <em>plus de confort.</em>', 'Less waste, <em>more comfort.</em>'],
  ['Un devis <i', 'Get a quote <i'],
  ['<h3>Économe</h3><p>Chaque kWh utile.</p>', '<h3>Efficient</h3><p>Every kWh put to use.</p>'],
  ['<h3>Pilotable</h3><p>Le bon degré, à la bonne heure.</p>', '<h3>Controllable</h3><p>The right temperature, at the right time.</p>'],
  ['<h3>Durable</h3><p>Du matériel qui tient.</p>', '<h3>Durable</h3><p>Equipment built to last.</p>'],
  ['<h3>Serein</h3><p>Un artisan enregistré.</p>', '<h3>Worry-free</h3><p>A registered tradesman.</p>'],

  // Questions
  ['Vos questions, <em>en bref.</em>', 'Your questions, <em>in short.</em>'],
  ['Que pouvez-vous installer ?', 'What can you install?'],
  ['<p>Chauffage central, climatisation, gaz et sanitaire.</p>', '<p>Central heating, air conditioning, gas and plumbing.</p>'],
  ['Où êtes-vous basés ?', 'Where are you based?'],
  ['À Quaregnon, dans la région de Mons-Borinage. Dites-nous où se trouve votre chantier.', 'In Quaregnon, in the Mons-Borinage region. Tell us where your job is.'],
  ['Depuis quand êtes-vous actifs ?', 'How long have you been active?'],
  ['<p>Depuis le 11 octobre 2016.</p>', '<p>Since 11 October 2016.</p>'],
  ['Comment vérifier votre entreprise ?', 'How can I check your business?'],
  ['Par notre numéro BCE, 0664.557.193, sur le registre public belge.', 'With our company number, 0664.557.193, on the Belgian public register (BCE).'],

  // Preuves
  ['Vérifiable', 'Verifiable'],
  ['Ne nous croyez pas <em>sur parole.</em>', 'Don’t just <em>take our word for it.</em>'],
  ['Actif depuis le 11 octobre 2016.', 'Active since 11 October 2016.'],
  ['Statut · Registre BCE', 'Status · BCE register'],
  ['<blockquote>Chauffage central, climatisation, gaz, sanitaire.</blockquote>', '<blockquote>Central heating, air conditioning, gas, plumbing.</blockquote>'],
  ['Compétences · Registre BCE', 'Qualifications · BCE register'],
  ['BCE 0664.557.193, assujetti à la TVA.', 'Company no. 0664.557.193, VAT registered.'],
  ['Identité · Registre BCE', 'Identity · BCE register'],
  ['Fiche officielle', 'Official record'],

  // Contact
  ['Parlons de <em>votre chauffage.</em>', 'Let’s talk about <em>your heating.</em>'],
  ['<small>Itinéraire</small>', '<small>Directions</small>'],
  ['<small>Appeler</small>', '<small>Call</small>'],
  ['<small>Écrire</small>', '<small>Email</small>'],
  ['<span>Nom</span>', '<span>Name</span>'],
  ['<span>Téléphone</span>', '<span>Phone</span>'],
  ['<span>Votre besoin</span>', '<span>What do you need?</span>'],
  ['Envoyer ma demande', 'Send my request'],
  ['Vos données servent uniquement à répondre à votre demande.', 'Your data is only used to answer your request.'],

  // Final
  ['Il fait bon <em>chez vous.</em>', 'Warm and cosy <em>at home.</em>'],

  // Pied de page
  ['Une panne, une question ?', 'A breakdown, a question?'],
  ['<p>Plus de chaleur, moins d’énergie.</p>', '<p>More warmth, less energy.</p>'],
  ['Chauffage, ventilation, climatisation (CVC) et installation de systèmes thermiques, dans la région de Mons-Borinage.', 'Heating, ventilation, air conditioning (HVAC) and thermal system installation in the Mons-Borinage region.'],
  ['<h3>Le site</h3>', '<h3>Site</h3>'],
  ['7390 Quaregnon, Belgique', '7390 Quaregnon, Belgium'],
  ['<dt>Exploitant</dt>', '<dt>Owner</dt>'],
  ['Youssef Garziad, personne physique, sous la dénomination ECO-CHAUFFE', 'Youssef Garziad, sole trader, trading as ECO-CHAUFFE'],
  ['<dt>Établissement</dt>', '<dt>Business address</dt>'],
  ['Numéro d’entreprise</dt>', 'Company number</dt>'],
  ['TVA BE 0664.557.193', 'VAT BE 0664.557.193'],
  ['Compétences enregistrées', 'Registered qualifications'],
  ['<dd>Chauffage central, climatisation, gaz, sanitaire</dd>', '<dd>Central heating, air conditioning, gas, plumbing</dd>'],
  ['Tous droits réservés.', 'All rights reserved.'],
  ['Haut de page ↑', 'Back to top ↑'],

  // Panneaux de services
  ['De la chaudière au dernier radiateur, une chaleur égale dans chaque pièce.', 'From the boiler to the last radiator, even warmth in every room.'],
  ['>Chaudière<', '>Boiler<'],
  ['>Radiateurs<', '>Radiators<'],
  ['>Circuit<', '>Pipework<'],
  ['>Régulation<', '>Controls<'],
  ['Un projet de <em>chauffage central ?</em>', 'A <em>central heating</em> project?'],
  ['Une température stable, même au cœur de l’été.', 'A steady temperature, even at the height of summer.'],
  ['>Unité intérieure<', '>Indoor unit<'],
  ['>Unité extérieure<', '>Outdoor unit<'],
  ['>Raccordements<', '>Connections<'],
  ['>Mise en service<', '>Commissioning<'],
  ['Un projet de <em>climatisation ?</em>', 'An <em>air conditioning</em> project?'],
  ['Un réseau posé avec soin, de l’arrivée jusqu’à l’appareil.', 'Carefully laid pipework, from the supply to the appliance.'],
  ['>Conduites<', '>Pipes<'],
  ['>Appareils<', '>Appliances<'],
  ['>Contrôle<', '>Checks<'],
  ['Un projet de <em>gaz ?</em>', 'A <em>gas</em> project?'],
  ['L’eau chaude et l’eau froide, là où vous en avez besoin.', 'Hot and cold water, right where you need it.'],
  ['>Arrivées d’eau<', '>Water supply<'],
  ['>Évacuations<', '>Drains<'],
  ['>Eau chaude<', '>Hot water<'],
  ['Un projet de <em>sanitaire ?</em>', 'A <em>plumbing</em> project?'],
  ['Un air sain et renouvelé, pièce par pièce.', 'Clean, fresh air, room by room.'],
  ['>Extraction<', '>Extraction<'],
  ['>Gaines<', '>Ducts<'],
  ['>Bouches<', '>Vents<'],
  ['>Réglages<', '>Balancing<'],
  ['Un projet de <em>ventilation ?</em>', 'A <em>ventilation</em> project?'],
  ['<small>Service suivant</small>', '<small>Next service</small>'],

  // Liens légaux
  ['<a href="/mentions-legales.html">Mentions légales</a>', '<a href="/en/legal-notice.html">Legal notice</a>'],
  ['<a href="/confidentialite.html">Confidentialité</a>', '<a href="/en/privacy.html">Privacy</a>'],
  ['<a href="/confidentialite.html#cookies">Cookies</a>', '<a href="/en/privacy.html#cookies">Cookies</a>'],
  ['<a href="/confidentialite.html">Politique de confidentialité</a>', '<a href="/en/privacy.html">Privacy policy</a>'],
  ['<a href="/confidentialite.html">politique de confidentialité</a>', '<a href="/en/privacy.html">privacy policy</a>'],

  // Mentions légales
  ['<title>Mentions légales | ECO-CHAUFFE</title>', '<title>Legal notice | ECO-CHAUFFE</title>'],
  ['Mentions légales du site ECO-CHAUFFE, Quaregnon : exploitant, numéro d’entreprise, TVA et coordonnées.', 'Legal notice of the ECO-CHAUFFE website, Quaregnon: owner, company number, VAT and contact details.'],
  ['<h1>Mentions légales</h1>', '<h1>Legal notice</h1>'],
  ['Dernière mise à jour : novembre 2026', 'Last updated: November 2026. Translation for convenience; the French version prevails.'],
  ['<h2>Exploitant du site</h2>', '<h2>Website owner</h2>'],
  ['Youssef Garziad, personne physique, exerçant sous la dénomination ECO-CHAUFFE.', 'Youssef Garziad, sole trader, trading as ECO-CHAUFFE.'],
  ['<p>Rue Alphonse Brenez 206, 7390 Quaregnon, Belgique</p>', '<p>Rue Alphonse Brenez 206, 7390 Quaregnon, Belgium</p>'],
  ['<dd>Rue Alphonse Brenez 206, 7390 Quaregnon, Belgique</dd>', '<dd>Rue Alphonse Brenez 206, 7390 Quaregnon, Belgium</dd>'],
  ['Téléphone : <a', 'Phone: <a'],
  ['E-mail : <a', 'Email: <a'],
  ['<h2>Numéro d’entreprise et TVA</h2>', '<h2>Company number and VAT</h2>'],
  ['Numéro d’entreprise (BCE) : 0664.557.193', 'Company number (BCE): 0664.557.193'],
  ['Consulter la fiche officielle à la Banque-Carrefour des Entreprises', 'View the official record at the Crossroads Bank for Enterprises'],
  ['<h2>Activité et compétences</h2>', '<h2>Activity and qualifications</h2>'],
  ['<p>Chauffage, ventilation, climatisation (CVC) et installation de systèmes thermiques.</p>', '<p>Heating, ventilation, air conditioning (HVAC) and thermal system installation.</p>'],
  ['Compétences professionnelles enregistrées à la Banque-Carrefour des Entreprises depuis le 28 octobre 2016 : chauffage central, climatisation, gaz, sanitaire.', 'Professional qualifications registered at the Crossroads Bank for Enterprises since 28 October 2016: central heating, air conditioning, gas, plumbing.'],
  ['<h2>Hébergement</h2>', '<h2>Hosting</h2>'],
  ['Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.', 'Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States.'],
  ['<h2>Contenu du site</h2>', '<h2>Website content</h2>'],
  ['Les informations de ce site sont données à titre général et ne constituent pas un devis. Le prix et les conditions d’une intervention sont précisés avant le début des travaux.', 'The information on this website is general and is not a quote. The price and terms of any job are confirmed before work begins.'],
  ['<h2>Propriété intellectuelle</h2>', '<h2>Intellectual property</h2>'],
  ['Les textes et éléments graphiques de ce site ne peuvent pas être reproduits sans autorisation préalable.', 'The texts and graphics on this website may not be reproduced without prior permission.'],
  ['Sauf mention contraire, les photographies et la vidéo sont des images d’illustration issues des banques libres Pexels et Mixkit.', 'Unless stated otherwise, the photos and video are illustrative images from the free libraries Pexels and Mixkit.'],
  ['<h2>Litiges</h2>', '<h2>Disputes</h2>'],
  ['Le droit belge s’applique. En cas de litige, un consommateur peut s’adresser au <a href="https://mediationconsommateur.be/" target="_blank" rel="noopener">Service de Médiation pour le Consommateur</a>. Cette procédure est volontaire.', 'Belgian law applies. In the event of a dispute, a consumer can contact the <a href="https://mediationconsommateur.be/" target="_blank" rel="noopener">Belgian Consumer Mediation Service</a>. This procedure is voluntary.'],
  ['<h2>Données personnelles</h2>', '<h2>Personal data</h2>'],
  ['Voir la <a', 'See the <a'],
  ['← Retour au site', '← Back to the website'],

  // Confidentialité
  ['<title>Politique de confidentialité | ECO-CHAUFFE</title>', '<title>Privacy policy | ECO-CHAUFFE</title>'],
  ['Comment ECO-CHAUFFE traite vos données personnelles et vos droits. Ce site ne dépose aucun cookie.', 'How ECO-CHAUFFE handles your personal data and your rights. This website sets no cookies.'],
  ['<h1>Politique de confidentialité</h1>', '<h1>Privacy policy</h1>'],
  ['<h2>Responsable du traitement</h2>', '<h2>Data controller</h2>'],
  ['Youssef Garziad (ECO-CHAUFFE), Rue Alphonse Brenez 206, 7390 Quaregnon, Belgique. BCE et TVA BE 0664.557.193. Contact : <a', 'Youssef Garziad (ECO-CHAUFFE), Rue Alphonse Brenez 206, 7390 Quaregnon, Belgium. Company number and VAT BE 0664.557.193. Contact: <a'],
  ['<h2>Données collectées</h2>', '<h2>Data collected</h2>'],
  ['Le formulaire de contact recueille votre nom, votre téléphone et votre demande. Vous pouvez aussi nous écrire ou nous appeler directement : nous recevons alors les coordonnées que vous nous communiquez.', 'The contact form collects your name, your phone number and your request. You can also email or call us directly: we then receive the details you give us.'],
  ['<h2>Pourquoi ces données</h2>', '<h2>Why we use this data</h2>'],
  ['Elles servent uniquement à répondre à votre demande et à préparer un éventuel devis, à votre demande. Elles ne sont ni vendues, ni utilisées à des fins publicitaires.', 'It is only used to answer your request and to prepare a quote if you ask for one. It is neither sold nor used for advertising.'],
  ['<h2>Destinataires</h2>', '<h2>Recipients</h2>'],
  ['Le formulaire ouvre votre propre messagerie : votre message part de votre compte vers garziad@hotmail.com, et ce site n’enregistre rien. Cette boîte aux lettres est hébergée par Microsoft (Hotmail).', 'The form opens your own email app: your message goes from your account to garziad@hotmail.com, and this website stores nothing. This mailbox is hosted by Microsoft (Hotmail).'],
  ['Le site est hébergé par Vercel Inc., qui peut traiter des données techniques de connexion, comme l’adresse IP, pour le servir.', 'The website is hosted by Vercel Inc., which may process technical connection data, such as IP addresses, in order to serve it.'],
  ['<h2>Durée de conservation</h2>', '<h2>How long we keep it</h2>'],
  ['Vos données sont conservées le temps nécessaire au traitement de votre demande et au suivi de la relation commerciale, puis supprimées, sauf obligation légale contraire.', 'Your data is kept for as long as needed to handle your request and follow up on the business relationship, then deleted, unless the law requires otherwise.'],
  ['<h2>Vos droits</h2>', '<h2>Your rights</h2>'],
  ['Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, leur portabilité, la limitation de leur traitement ou vous y opposer, en écrivant à l’adresse ci-dessus. Vous pouvez aussi introduire une plainte auprès de l’<a href="https://www.autoriteprotectiondonnees.be/" target="_blank" rel="noopener">Autorité de protection des données</a>.', 'You can ask to access, correct, erase or port your data, to restrict its processing, or object to it, by writing to the address above. You can also complain to the <a href="https://www.dataprotectionauthority.be/" target="_blank" rel="noopener">Belgian Data Protection Authority</a>.'],
  ['Ce site ne dépose aucun cookie, ni de mesure d’audience, ni publicitaire. Ses polices, photos et vidéos sont servies depuis le site lui-même.', 'This website sets no cookies, neither for analytics nor for advertising. Its fonts, photos and videos are served from the website itself.'],
  ['Les liens vers Google Maps, la Banque-Carrefour des Entreprises et les autres sites externes ouvrent des services tiers, soumis à leurs propres règles.', 'Links to Google Maps, the Crossroads Bank for Enterprises and other external websites open third-party services, subject to their own rules.'],
  ['© 2026 ECO-CHAUFFE. BCE et TVA BE 0664.557.193.', '© 2026 ECO-CHAUFFE. Company number and VAT BE 0664.557.193.'],
  // Barre d'action sur téléphone
  ['</svg>Appeler</a>', '</svg>Call</a>'],
  ['</svg>Devis</a>', '</svg>Quote</a>'],
  ['</svg>Itinéraire</a>', '</svg>Directions</a>'],
]

// Noms des services, partout où ils apparaissent
for (const [fr, en] of SERVICES) {
  T.push([`>${fr}<`, `>${en}<`], [`data-name="${fr}"`, `data-name="${en}"`], [`Voir le détail : ${fr}`, `View details: ${en}`], [`Service suivant : ${fr}`, `Next service: ${en}`])
}

const PAGES = [
  { from: 'index.html', to: 'en/index.html', fr: '/', en: '/en/' },
  { from: 'mentions-legales.html', to: 'en/legal-notice.html', fr: '/mentions-legales.html', en: '/en/legal-notice.html' },
  { from: 'confidentialite.html', to: 'en/privacy.html', fr: '/confidentialite.html', en: '/en/privacy.html' },
]

const lang = (fr, en) => `<div class="lang" data-lang="en" role="group" aria-label="Language"><i class="lang-thumb"></i><a href="${fr}" lang="fr" hreflang="fr">FR</a><a href="${en}" lang="en" aria-current="true">EN</a></div>`

// Plus long d'abord : une phrase entière passe avant ses morceaux
const SORTED = [...T].sort((a, b) => b[0].length - a[0].length)
const used = new Set()
mkdirSync('en', { recursive: true })

for (const p of PAGES) {
  let h = readFileSync(p.from, 'utf8').replace(/\r\n/g, '\n')
  h = h.replace(/<div class="lang"[\s\S]*?<\/div>/, '@@LANG@@')
  for (const [a, b] of SORTED) if (h.includes(a)) { used.add(a); h = h.split(a).join(b) }
  h = h.replace('@@LANG@@', () => lang(p.fr, p.en))
  // Liens internes restants : logo et « retour au site » vers la page d'accueil anglaise
  h = h.split('href="/" aria-label').join('href="/en/" aria-label').split('<a class="lg-back" href="/">').join('<a class="lg-back" href="/en/">')
  writeFileSync(p.to, h)

  // Contrôle : du français reste-t-il ?
  const text = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  const bits = [...text.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).concat([...text.matchAll(/(?:alt|aria-label|content)="([^"]+)"/g)].map((m) => m[1]))
  const fr = /[éèêàùçôîû]|\b(le|la|les|des|du|et|pour|votre|vos|nous|depuis|une|chez|dans|avec|sans)\b/i
  const ok = /Rue Alphonse Brenez|ECO-CHAUFFE|façade|noindex|Quaregnon$/
  const left = [...new Set(bits)].filter((t) => fr.test(t) && !ok.test(t))
  if (left.length) console.warn(`[i18n] français restant dans ${p.to} :\n  ${left.join('\n  ')}`)
}
const unused = T.filter(([a]) => !used.has(a)).map(([a]) => a)
if (unused.length) console.warn(`[i18n] phrases sans correspondance (source modifiée ?) :\n  ${unused.join('\n  ').slice(0, 900)}`)
console.log('[i18n] pages anglaises générées')
