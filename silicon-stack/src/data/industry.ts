/**
 * Silicon Stack — all editable content lives in this file.
 *
 * Accuracy rules for editors:
 *  - Describe stable industry structure, not fast-moving numbers.
 *  - Avoid precise market shares, prices or revenues. If a number is needed,
 *    prefix it with "approx." — the site footer carries the
 *    "Figures approximate; verify current data." footnote.
 *  - Relationships describe typical industry patterns, not confirmed contracts.
 */

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

/** Keys map to Lucide icons in src/components/Icon.tsx */
export type IconKey =
  | 'flask'
  | 'code'
  | 'cog'
  | 'cpu'
  | 'factory'
  | 'memory'
  | 'layers'
  | 'server'
  | 'cloud'
  | 'mountain'
  | 'disc'
  | 'pen'
  | 'sun'
  | 'wind'
  | 'scissors'
  | 'package'
  | 'check'
  | 'building'

/** Colour accents used across the UI (see src/index.css @theme). */
export type Accent = 'cyan' | 'teal' | 'amber' | 'violet' | 'green' | 'slate'

export type LayerId =
  | 'materials'
  | 'eda'
  | 'equipment'
  | 'design'
  | 'foundry'
  | 'memory'
  | 'packaging'
  | 'systems'
  | 'customers'

export type Rating = 'High' | 'Medium' | 'Low'

/* ------------------------------------------------------------------ */
/* Site meta & navigation                                              */
/* ------------------------------------------------------------------ */

export const site = {
  name: 'Silicon Stack',
  title: 'From Sand to Supercomputer',
  subtitle:
    'How the semiconductor industry really works — nine layers, three hero companies, and one AI chip’s journey from a beach to a data centre.',
  scrollHint: 'Scroll to zoom into the wafer',
  footnote: 'Figures approximate; verify current data.',
  disclaimer:
    'This is an educational overview. Company roles and relationships describe typical industry structure, not confirmed contracts, and the industry changes quickly. Nothing here is investment advice.',
}

export const navItems: { id: string; label: string }[] = [
  { id: 'stack', label: 'The Stack' },
  { id: 'journey', label: 'Journey' },
  { id: 'companies', label: 'Companies' },
  { id: 'network', label: 'Dependencies' },
  { id: 'models', label: 'Business Models' },
  { id: 'map', label: 'Map' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'quiz', label: 'Quiz' },
]

/** Intro copy for each section heading. */
export const sectionIntros = {
  stack: {
    eyebrow: '01 · The 9-Layer Stack',
    title: 'One chip, nine industries',
    body: 'No single company makes a modern chip. It takes a stack of specialised industries, each depending on the one below. Select any layer to see what happens there and why it matters.',
  },
  journey: {
    eyebrow: '02 · Journey of an AI Chip',
    title: 'Follow one GPU from sand to the cloud',
    body: 'Scroll to move a single AI chip through every station of the supply chain — across several countries and many months.',
  },
  companies: {
    eyebrow: '03 · Hero Companies',
    title: 'Three companies, three very different positions',
    body: 'AT&S, ASML and NVIDIA sit in different layers of the stack. Each is hard to replace — for different reasons.',
  },
  network: {
    eyebrow: '04 · Who Depends on Whom',
    title: 'A web of single points of failure',
    body: 'Hover or tap a company to light up who it buys from (upstream) and who it sells to (downstream). Dots show the direction goods flow.',
  },
  models: {
    eyebrow: '05 · Business Models Compared',
    title: 'Same industry, very different economics',
    body: 'Selling machines, designing chips, running factories and building substrates are distinct businesses with different risks.',
  },
  map: {
    eyebrow: '06 · Geography',
    title: 'Where each layer lives',
    body: 'The stack is spread across the globe, but each layer is concentrated in only a few places. Select a pin to see what happens there.',
  },
  glossary: {
    eyebrow: '07 · Glossary',
    title: 'Speak the language',
    body: 'Plain-English definitions of the jargon you will hear in any semiconductor conversation.',
  },
  quiz: {
    eyebrow: '08 · Quiz',
    title: 'Check your understanding',
    body: 'Eight quick questions. You get instant feedback on each one.',
  },
}

/* ------------------------------------------------------------------ */
/* 1. The 9-layer stack                                                */
/* ------------------------------------------------------------------ */

export interface Layer {
  id: LayerId
  name: string
  /** One-line summary shown on the collapsed bar. */
  short: string
  icon: IconKey
  accent: Accent
  whatHappens: string
  whyItMatters: string
  companies: string[]
  howTheyMakeMoney: string
  bottlenecks: string[]
}

/** Ordered bottom (foundation) to top (customers). */
export const layers: Layer[] = [
  {
    id: 'materials',
    name: 'Materials & Chemicals',
    short: 'Ultra-pure silicon, gases, photoresists and films',
    icon: 'flask',
    accent: 'slate',
    whatHappens:
      'Suppliers turn raw inputs into extraordinarily pure materials: polished silicon wafers, specialty gases, light-sensitive photoresists, polishing slurries and insulating films such as ABF used in chip substrates.',
    whyItMatters:
      'A single speck of contamination can ruin a chip. Fabs only use materials that have passed long qualification tests, so suppliers are rarely swapped.',
    companies: ['Shin-Etsu', 'SUMCO', 'GlobalWafers', 'JSR', 'Tokyo Ohka (TOK)', 'Ajinomoto (ABF film)', 'Linde', 'Air Liquide', 'Entegris'],
    howTheyMakeMoney:
      'They sell consumables by volume. Every wafer processed uses more material, so revenue tracks how busy the fabs are. Long qualification cycles make customer relationships sticky.',
    bottlenecks: [
      'Several critical materials come from a handful of suppliers, many of them in Japan',
      'Purity requirements are extreme and hard to scale quickly',
      'Switching supplier can take a year or more of re-qualification',
    ],
  },
  {
    id: 'eda',
    name: 'Design Tools & IP (EDA)',
    short: 'Software and licensed building blocks used to design chips',
    icon: 'code',
    accent: 'violet',
    whatHappens:
      'Electronic Design Automation (EDA) software lets engineers describe, simulate and lay out billions of transistors. IP companies license ready-made building blocks, such as processor cores or interfaces, so designers do not start from zero.',
    whyItMatters:
      'No modern chip can be designed by hand. The tools are tuned to each factory’s manufacturing process, so designers, toolmakers and foundries must work closely together.',
    companies: ['Synopsys', 'Cadence', 'Siemens EDA', 'Arm (IP)'],
    howTheyMakeMoney:
      'EDA vendors sell multi-year software licences and subscriptions. IP companies charge an upfront licence fee plus a small royalty on every chip shipped that uses their design.',
    bottlenecks: [
      'A very small number of vendors dominate the toolchain',
      'Tools are subject to export-control rules',
      'Experienced chip-design engineers are scarce',
    ],
  },
  {
    id: 'equipment',
    name: 'Manufacturing Equipment',
    short: 'The machines that print, etch, deposit and inspect',
    icon: 'cog',
    accent: 'cyan',
    whatHappens:
      'Equipment makers build the tools inside a chip factory: lithography machines that print patterns with light, plus machines that etch, deposit thin films, clean, polish and inspect wafers.',
    whyItMatters:
      'Without these machines there is no manufacturing. The most advanced lithography tool — EUV — is made by only one company, ASML.',
    companies: ['ASML', 'Applied Materials', 'Lam Research', 'Tokyo Electron', 'KLA'],
    howTheyMakeMoney:
      'They sell very expensive machines, then earn recurring revenue for years from service, spare parts and upgrades across the installed base.',
    bottlenecks: [
      'ASML is the only supplier of EUV lithography machines',
      'Long build and delivery times for advanced tools',
      'Deep, specialised supply chains (e.g. precision optics)',
      'Export controls restrict which tools can be sold to which countries',
    ],
  },
  {
    id: 'design',
    name: 'Chip Design (Fabless vs IDM)',
    short: 'Companies that decide what a chip does',
    icon: 'cpu',
    accent: 'green',
    whatHappens:
      'Designers define the chip’s architecture and turn it into a detailed layout. “Fabless” firms (like NVIDIA, AMD, Qualcomm) design only and pay a foundry to manufacture. “IDMs” (Integrated Device Manufacturers, like Intel or Texas Instruments) design and manufacture in their own fabs.',
    whyItMatters:
      'Design is where product value is created — performance, power efficiency and features. The fabless model lets designers focus on innovation without building factories.',
    companies: ['NVIDIA', 'AMD', 'Qualcomm', 'Broadcom', 'Apple', 'MediaTek', 'Intel (IDM)', 'Texas Instruments (IDM)'],
    howTheyMakeMoney:
      'They sell chips (and increasingly boards, systems and software) at a margin over manufacturing cost. Fabless firms carry high R&D cost but avoid factory cost.',
    bottlenecks: [
      'Designing a leading-edge chip is extremely expensive',
      'Fabless firms depend on getting scarce foundry capacity',
      'Shortage of skilled design engineers',
    ],
  },
  {
    id: 'foundry',
    name: 'Foundry',
    short: 'Contract factories that manufacture other companies’ designs',
    icon: 'factory',
    accent: 'cyan',
    whatHappens:
      'Foundries run the fabs (fabrication plants) where designs are built onto silicon wafers through hundreds of steps of lithography, etching, deposition and inspection over a period of months.',
    whyItMatters:
      'Only a few companies can manufacture at the most advanced nodes. Leading-edge production is heavily concentrated in Taiwan, making this a strategic chokepoint.',
    companies: ['TSMC', 'Samsung Foundry', 'Intel Foundry', 'GlobalFoundries', 'UMC', 'SMIC'],
    howTheyMakeMoney:
      'They charge per processed wafer. More advanced nodes command higher prices. Profit depends on keeping very expensive fabs full and yields high.',
    bottlenecks: [
      'A leading-edge fab costs tens of billions of dollars (approx.)',
      'Geographic concentration of advanced manufacturing',
      'Raising yield on a new process takes time and experience',
    ],
  },
  {
    id: 'memory',
    name: 'Memory (incl. HBM)',
    short: 'Chips that store data — including the HBM that feeds AI',
    icon: 'memory',
    accent: 'teal',
    whatHappens:
      'Memory makers produce DRAM (working memory) and NAND flash (storage). For AI, they stack several DRAM dies vertically into High Bandwidth Memory (HBM), placed right next to the GPU.',
    whyItMatters:
      'AI chips are often limited by how fast they can get data, not by how fast they compute. HBM is a key ingredient — and has been one of the tightest supply bottlenecks.',
    companies: ['SK hynix', 'Samsung', 'Micron'],
    howTheyMakeMoney:
      'They sell memory chips. Standard memory prices swing with supply and demand (a very cyclical business); HBM is more specialised and is typically agreed in longer-term deals.',
    bottlenecks: [
      'Only three major suppliers of advanced DRAM and HBM',
      'Stacking dies with through-silicon vias is hard and lowers yield',
      'Memory pricing cycles create boom-and-bust swings',
    ],
  },
  {
    id: 'packaging',
    name: 'Substrates & Advanced Packaging',
    short: 'Connecting tiny chips to the outside world',
    icon: 'layers',
    accent: 'amber',
    whatHappens:
      'A bare chip (die) is too small and delicate to plug into a board. It is mounted on an IC substrate — a miniature multilayer circuit board — that routes thousands of microscopic connections out to the board. Advanced packaging (e.g. TSMC’s CoWoS) places GPU and HBM side-by-side on a silicon interposer first.',
    whyItMatters:
      'Packaging has become a performance feature, not an afterthought. For AI chips, packaging and substrate capacity have at times limited how many GPUs could be shipped.',
    companies: ['AT&S', 'Ibiden', 'Unimicron', 'Shinko', 'Samsung Electro-Mechanics', 'TSMC (CoWoS)', 'ASE', 'Amkor'],
    howTheyMakeMoney:
      'Substrate makers sell substrates per unit, often under multi-year capacity agreements, sometimes with customer co-investment. OSATs (outsourced assembly & test) charge per package assembled and tested.',
    bottlenecks: [
      'Large AI substrates with many layers are hard to make at high yield',
      'Advanced packaging capacity (e.g. CoWoS) has been scarce',
      'Key materials such as ABF film come from very few suppliers',
    ],
  },
  {
    id: 'systems',
    name: 'Systems & Assembly',
    short: 'Turning chips into servers, racks and devices',
    icon: 'server',
    accent: 'slate',
    whatHappens:
      'Contract manufacturers and server makers mount chips on boards, add power, cooling and networking, and assemble complete servers and racks — or phones, PCs and cars.',
    whyItMatters:
      'An AI GPU is useless without power delivery, cooling and fast networking. Modern AI racks are complex machines in their own right, increasingly liquid-cooled.',
    companies: ['Foxconn (Hon Hai)', 'Quanta', 'Wistron', 'Supermicro', 'Dell', 'HPE'],
    howTheyMakeMoney:
      'They earn assembly and integration margins — usually thin percentages on very large volumes — plus service and support for branded server makers.',
    bottlenecks: [
      'Power and cooling designs for dense AI racks',
      'Any missing component halts assembly',
      'Large, complex logistics across many countries',
    ],
  },
  {
    id: 'customers',
    name: 'End Customers',
    short: 'Cloud giants, enterprises and device makers',
    icon: 'cloud',
    accent: 'teal',
    whatHappens:
      'Hyperscalers (AWS, Microsoft, Google, Meta and others), enterprises, governments and consumer-device brands buy the finished systems and put them to work — training AI models, running cloud services, powering phones and cars.',
    whyItMatters:
      'Their spending decisions ripple all the way down the stack. A change in cloud capex plans can shift orders for machines, materials and substrates years ahead.',
    companies: ['Amazon (AWS)', 'Microsoft', 'Google', 'Meta', 'Oracle', 'Enterprises & governments'],
    howTheyMakeMoney:
      'They sell cloud computing, AI services, advertising and devices. Some are also designing their own custom chips to reduce dependence on suppliers.',
    bottlenecks: [
      'Electricity and grid connections for new data centres',
      'Data-centre construction lead times',
      'Cost of AI infrastructure versus revenue it generates',
    ],
  },
]

/* ------------------------------------------------------------------ */
/* 2. Journey of an AI chip                                            */
/* ------------------------------------------------------------------ */

export interface JourneyStop {
  id: string
  title: string
  /** Who / where — kept generic where the real supplier varies. */
  where: string
  caption: string
  icon: IconKey
  accent: Accent
}

export const journey: JourneyStop[] = [
  {
    id: 'sand',
    title: 'Sand',
    where: 'Quartz mines',
    caption: 'High-purity quartz is refined into polysilicon — one of the purest materials humans make.',
    icon: 'mountain',
    accent: 'slate',
  },
  {
    id: 'wafer',
    title: 'Wafer',
    where: 'Wafer makers (e.g. Japan, Taiwan)',
    caption: 'Silicon is grown into a single-crystal ingot, sliced into 300 mm wafers and polished mirror-smooth.',
    icon: 'disc',
    accent: 'slate',
  },
  {
    id: 'design',
    title: 'Design',
    where: 'NVIDIA (USA & worldwide)',
    caption: 'NVIDIA engineers design the GPU using EDA software and send the final layout to the foundry (“tape-out”).',
    icon: 'pen',
    accent: 'green',
  },
  {
    id: 'litho',
    title: 'Lithography',
    where: 'ASML machine in a TSMC fab (Taiwan)',
    caption: 'An ASML EUV scanner projects the circuit pattern onto the wafer with 13.5 nm light — layer after layer.',
    icon: 'sun',
    accent: 'cyan',
  },
  {
    id: 'etch',
    title: 'Etch & deposition',
    where: 'TSMC fab',
    caption: 'Material is etched away and new films are deposited, repeated hundreds of times over many weeks.',
    icon: 'wind',
    accent: 'cyan',
  },
  {
    id: 'dicing',
    title: 'Test & dicing',
    where: 'Fab / back-end site',
    caption: 'Each die is tested on the wafer, then the wafer is cut into individual dies. Good dies move on — that ratio is “yield”.',
    icon: 'scissors',
    accent: 'cyan',
  },
  {
    id: 'package',
    title: 'Packaging',
    where: 'Advanced packaging (e.g. TSMC CoWoS) + IC substrate makers such as AT&S',
    caption: 'The GPU die and HBM memory stacks sit on an interposer, mounted on a multilayer IC substrate that routes signals to the board.',
    icon: 'layers',
    accent: 'amber',
  },
  {
    id: 'test',
    title: 'Final test',
    where: 'Packaging & test sites',
    caption: 'Finished packages are stress-tested for function, speed and heat before shipping.',
    icon: 'check',
    accent: 'amber',
  },
  {
    id: 'rack',
    title: 'Server rack',
    where: 'Server makers (e.g. Foxconn, Supermicro)',
    caption: 'GPUs are mounted on boards with networking, power and cooling, then built into full racks.',
    icon: 'server',
    accent: 'slate',
  },
  {
    id: 'dc',
    title: 'Data centre',
    where: 'Hyperscalers & cloud providers',
    caption: 'Thousands of GPUs work together to train and run AI models — the product you finally interact with.',
    icon: 'building',
    accent: 'teal',
  },
]

/* ------------------------------------------------------------------ */
/* 3. Hero company deep dives                                          */
/* ------------------------------------------------------------------ */

export type CompanyId = 'ats' | 'asml' | 'nvidia'

export interface Company {
  id: CompanyId
  name: string
  fullName: string
  hq: string
  tagline: string
  accent: Accent
  /** Primary layers are highlighted strongly; secondary layers softly. */
  layers: { primary: LayerId[]; secondary: LayerId[] }
  whatItMakes: string
  businessModel: string
  customers: string[]
  suppliers: string[]
  moat: string[]
  risks: string[]
  visualTitle: string
  visualHint: string
}

export const companies: Company[] = [
  {
    id: 'ats',
    name: 'AT&S',
    fullName: 'AT&S Austria Technologie & Systemtechnik AG',
    hq: 'Leoben, Austria',
    tagline: 'The miniature highways between chip and board',
    accent: 'amber',
    layers: { primary: ['packaging'], secondary: ['systems'] },
    whatItMakes:
      'High-end IC substrates — thin, multilayer boards that a processor sits on, carrying thousands of microscopic copper connections from the chip out to the main circuit board. AT&S also makes advanced printed circuit boards for smartphones, cars, medical and industrial electronics.',
    businessModel:
      'A specialised manufacturer that builds to customers’ specifications. It invests heavily in plants (in Austria, China and Malaysia) and typically signs multi-year agreements with large processor makers to fill them.',
    customers: ['High-performance CPU & GPU makers (AMD has been publicly reported as a key customer)', 'Smartphone & consumer-electronics brands', 'Automotive, medical & industrial firms'],
    suppliers: ['ABF insulating film makers (e.g. Ajinomoto)', 'Copper foil & specialty chemicals', 'Laser-drilling, plating and inspection equipment makers'],
    moat: [
      'Process know-how for ultra-fine copper lines and many-layer substrates',
      'Long customer qualification — once designed in, it is hard to switch',
      'Few companies worldwide can make the largest, most complex substrates',
    ],
    risks: [
      'Very high capital spending for new plants relative to company size',
      'Dependence on a small number of large customers',
      'Demand cycles in PCs, servers and smartphones',
      'Strong Asian competitors and new technologies (e.g. glass substrates)',
    ],
    visualTitle: 'Inside an IC substrate',
    visualHint: 'Hover, tap or press the button to slide the layers apart and trace the copper routing.',
  },
  {
    id: 'asml',
    name: 'ASML',
    fullName: 'ASML Holding N.V.',
    hq: 'Veldhoven, Netherlands',
    tagline: 'The only company that makes EUV lithography machines',
    accent: 'cyan',
    layers: { primary: ['equipment'], secondary: [] },
    whatItMakes:
      'Lithography machines — giant, ultra-precise “projectors” that print circuit patterns onto silicon wafers using light. Its EUV (extreme ultraviolet) machines are essential for the most advanced chips; it also makes DUV machines and inspection tools.',
    businessModel:
      'Sells complex systems to chipmakers, then earns recurring revenue for years by servicing and upgrading its large installed base. Develops new generations (like High-NA EUV) together with its leading customers.',
    customers: ['TSMC', 'Samsung', 'Intel', 'SK hynix', 'Micron', 'Other chipmakers (DUV, subject to export rules)'],
    suppliers: ['Carl Zeiss SMT (precision optics)', 'Cymer (light sources, part of ASML)', 'TRUMPF (lasers for EUV light source)', 'Thousands of specialist suppliers'],
    moat: [
      'Sole supplier of EUV lithography — no alternative exists today',
      'Decades of R&D and a co-developed, highly specialised supply chain',
      'Each EUV machine has approx. 100,000 parts and needs ASML’s own service engineers',
    ],
    risks: [
      'Export controls and geopolitics limit sales to some countries',
      'A small number of very large customers',
      'Orders follow chipmakers’ spending cycles',
      'Reliance on single critical suppliers (e.g. optics)',
    ],
    visualTitle: 'How an EUV machine works',
    visualHint: 'Watch the light travel from source to wafer. All optics are mirrors, inside a vacuum.',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    fullName: 'NVIDIA Corporation',
    hq: 'Santa Clara, California, USA',
    tagline: 'The fabless designer powering the AI boom',
    accent: 'green',
    layers: { primary: ['design'], secondary: ['systems'] },
    whatItMakes:
      'GPUs (graphics processing units) and complete AI computing platforms: chips, boards, full rack-scale systems, high-speed networking, and the CUDA software that developers use to program them.',
    businessModel:
      'Fabless: NVIDIA designs the chips and outsources manufacturing to TSMC and packaging partners. It sells chips, boards and systems at high margins, and its software ecosystem keeps customers on its platform.',
    customers: ['Hyperscalers & cloud providers', 'Server makers (e.g. Foxconn, Supermicro, Dell)', 'Enterprises & research labs', 'Gamers & PC makers', 'Automakers'],
    suppliers: ['TSMC (wafers & CoWoS packaging)', 'SK hynix, Micron, Samsung (memory)', 'IC substrate makers', 'Packaging & test partners (OSATs)'],
    moat: [
      'CUDA: a software ecosystem developers have built on for many years',
      'Full stack — chips, networking, systems and software designed together',
      'Fast product cadence and deep relationships with the supply chain',
    ],
    risks: [
      'Dependence on TSMC and on manufacturing concentrated in Taiwan',
      'Largest customers are designing their own AI chips',
      'Export controls on advanced AI chips',
      'Supply bottlenecks in HBM and advanced packaging',
    ],
    visualTitle: 'Exploded view of a GPU package',
    visualHint: 'Hover, tap or press the button to pull the package apart.',
  },
]

/* ------------------------------------------------------------------ */
/* 4. Dependency network                                               */
/* ------------------------------------------------------------------ */

export interface NetworkNode {
  id: string
  label: string
  role: string
  accent: Accent
  /** Position in the SVG viewBox (0 0 1120 520). */
  x: number
  y: number
  note: string
}

/** Edges point in the direction goods flow: supplier → customer. */
export interface NetworkEdge {
  from: string
  to: string
  what: string
}

export const networkNodes: NetworkNode[] = [
  { id: 'asml', label: 'ASML', role: 'Lithography equipment', accent: 'cyan', x: 80, y: 230, note: 'Supplies the lithography machines every leading chipmaker needs.' },
  { id: 'tsmc', label: 'TSMC', role: 'Foundry & CoWoS', accent: 'cyan', x: 290, y: 60, note: 'Manufactures NVIDIA’s GPU dies and performs much of the advanced (CoWoS) packaging.' },
  { id: 'samsung', label: 'Samsung', role: 'Memory & foundry', accent: 'teal', x: 290, y: 145, note: 'Makes memory and runs a foundry; supplies memory used in GPUs.' },
  { id: 'intel', label: 'Intel', role: 'IDM', accent: 'violet', x: 290, y: 230, note: 'Designs and manufactures its own chips (e.g. server CPUs) and offers foundry services.' },
  { id: 'skhynix', label: 'SK hynix', role: 'HBM memory', accent: 'teal', x: 290, y: 315, note: 'A leading supplier of HBM stacked memory for AI accelerators.' },
  { id: 'micron', label: 'Micron', role: 'HBM memory', accent: 'teal', x: 290, y: 400, note: 'US memory maker that also supplies HBM.' },
  { id: 'ibiden', label: 'Ibiden / Unimicron', role: 'IC substrates', accent: 'amber', x: 500, y: 390, note: 'Large Japanese and Taiwanese IC substrate makers.' },
  { id: 'ats', label: 'AT&S', role: 'IC substrates', accent: 'amber', x: 500, y: 470, note: 'Austrian maker of high-end IC substrates for high-performance processors.' },
  { id: 'osat', label: 'ASE / Amkor', role: 'Packaging & test', accent: 'amber', x: 690, y: 430, note: 'OSATs (outsourced assembly and test): mount chips onto substrates and test them.' },
  { id: 'nvidia', label: 'NVIDIA', role: 'Fabless GPU design', accent: 'green', x: 690, y: 200, note: 'Designs the GPU and orchestrates the whole supply chain around it.' },
  { id: 'foxconn', label: 'Foxconn', role: 'Server assembly', accent: 'slate', x: 870, y: 140, note: 'Contract manufacturer that builds AI servers and racks.' },
  { id: 'supermicro', label: 'Supermicro', role: 'Server maker', accent: 'slate', x: 870, y: 310, note: 'Builds and sells servers, including GPU systems.' },
  { id: 'hyperscalers', label: 'Hyperscalers', role: 'Cloud & AI giants', accent: 'teal', x: 1040, y: 225, note: 'AWS, Microsoft, Google, Meta and others buy AI servers by the thousand to run cloud and AI services.' },
]

export const networkEdges: NetworkEdge[] = [
  { from: 'asml', to: 'tsmc', what: 'EUV & DUV lithography' },
  { from: 'asml', to: 'samsung', what: 'EUV & DUV lithography' },
  { from: 'asml', to: 'intel', what: 'EUV & DUV lithography' },
  { from: 'asml', to: 'skhynix', what: 'Lithography for DRAM' },
  { from: 'asml', to: 'micron', what: 'Lithography for DRAM' },
  { from: 'tsmc', to: 'nvidia', what: 'GPU dies & CoWoS packaging' },
  { from: 'samsung', to: 'nvidia', what: 'Memory' },
  { from: 'skhynix', to: 'nvidia', what: 'HBM' },
  { from: 'micron', to: 'nvidia', what: 'HBM' },
  { from: 'ibiden', to: 'osat', what: 'IC substrates' },
  { from: 'ats', to: 'osat', what: 'IC substrates' },
  { from: 'osat', to: 'nvidia', what: 'Assembly & test' },
  { from: 'nvidia', to: 'foxconn', what: 'GPUs & boards' },
  { from: 'nvidia', to: 'supermicro', what: 'GPUs & boards' },
  { from: 'intel', to: 'supermicro', what: 'Server CPUs' },
  { from: 'foxconn', to: 'hyperscalers', what: 'AI servers & racks' },
  { from: 'supermicro', to: 'hyperscalers', what: 'AI servers' },
]

export const networkFootnote =
  'Simplified. Lines show typical industry relationships, not confirmed contracts; which supplier serves a specific product varies.'

/* ------------------------------------------------------------------ */
/* 5. Business models compared                                         */
/* ------------------------------------------------------------------ */

export interface BusinessModel {
  id: string
  model: string
  example: string
  accent: Accent
  sells: string
  earns: string
  capitalIntensity: Rating
  capitalNote: string
  typicalCustomer: string
  mainRisk: string
}

export const businessModels: BusinessModel[] = [
  {
    id: 'equipment',
    model: 'Equipment maker',
    example: 'ASML',
    accent: 'cyan',
    sells: 'Machines that make chips',
    earns: 'System sales, then years of service and upgrades',
    capitalIntensity: 'Medium',
    capitalNote: 'R&D-heavy rather than factory-heavy',
    typicalCustomer: 'Foundries, IDMs & memory makers',
    mainRisk: 'Customers’ spending cycles and export controls',
  },
  {
    id: 'fabless',
    model: 'Fabless designer',
    example: 'NVIDIA',
    accent: 'green',
    sells: 'Chip designs as finished chips, systems & software',
    earns: 'Margin on chips and platforms',
    capitalIntensity: 'Low',
    capitalNote: 'Outsources factories; very high R&D',
    typicalCustomer: 'Cloud providers, server & device makers',
    mainRisk: 'Depends on foundry capacity it does not control',
  },
  {
    id: 'foundry',
    model: 'Foundry',
    example: 'TSMC',
    accent: 'cyan',
    sells: 'Manufacturing as a service',
    earns: 'Price per processed wafer',
    capitalIntensity: 'High',
    capitalNote: 'Fabs cost tens of billions (approx.)',
    typicalCustomer: 'Fabless designers (and some IDMs)',
    mainRisk: 'Huge fixed costs if fabs are not kept full; geopolitics',
  },
  {
    id: 'substrate',
    model: 'Substrate maker',
    example: 'AT&S',
    accent: 'amber',
    sells: 'IC substrates & high-end circuit boards',
    earns: 'Price per substrate, often under multi-year deals',
    capitalIntensity: 'High',
    capitalNote: 'New plants are large relative to company size',
    typicalCustomer: 'Processor makers & electronics brands',
    mainRisk: 'Customer concentration and demand cycles',
  },
  {
    id: 'idm',
    model: 'IDM (Integrated Device Manufacturer)',
    example: 'Intel',
    accent: 'violet',
    sells: 'Its own branded chips (and foundry services)',
    earns: 'Margin on chips it both designs and makes',
    capitalIntensity: 'High',
    capitalNote: 'Funds both design and its own fabs',
    typicalCustomer: 'PC, server & device makers',
    mainRisk: 'Must win on both design and manufacturing at once',
  },
]

export const businessModelRows: { key: keyof BusinessModel; label: string }[] = [
  { key: 'sells', label: 'What they sell' },
  { key: 'earns', label: 'How they earn' },
  { key: 'capitalIntensity', label: 'Capital intensity' },
  { key: 'typicalCustomer', label: 'Typical customer' },
  { key: 'mainRisk', label: 'Main risk' },
]

/* ------------------------------------------------------------------ */
/* 6. Geography                                                        */
/* ------------------------------------------------------------------ */

export interface GeoPin {
  id: string
  country: string
  lat: number
  lon: number
  accent: Accent
  /** One line on what happens there. */
  line: string
  layers: LayerId[]
}

export const geoPins: GeoPin[] = [
  { id: 'usa', country: 'USA', lat: 37.4, lon: -110, accent: 'green', line: 'Chip design (NVIDIA, AMD, Apple, Qualcomm), EDA software and much of the equipment industry.', layers: ['design', 'eda', 'equipment'] },
  { id: 'netherlands', country: 'Netherlands', lat: 51.4, lon: 5.4, accent: 'cyan', line: 'ASML builds the world’s EUV lithography machines in Veldhoven.', layers: ['equipment'] },
  { id: 'austria', country: 'Austria', lat: 47.4, lon: 15.1, accent: 'amber', line: 'AT&S headquarters in Leoben: substrate and PCB technology and R&D.', layers: ['packaging'] },
  { id: 'japan', country: 'Japan', lat: 36.2, lon: 138.5, accent: 'slate', line: 'Critical materials (wafers, photoresists, ABF film) and major equipment makers.', layers: ['materials', 'equipment', 'packaging'] },
  { id: 'korea', country: 'South Korea', lat: 36.5, lon: 127.9, accent: 'teal', line: 'Samsung and SK hynix: memory leaders, including HBM for AI.', layers: ['memory', 'foundry'] },
  { id: 'taiwan', country: 'Taiwan', lat: 23.7, lon: 121, accent: 'cyan', line: 'TSMC’s leading-edge foundries and advanced packaging; many substrate and server makers.', layers: ['foundry', 'packaging', 'systems'] },
  { id: 'china', country: 'China', lat: 30.5, lon: 112, accent: 'slate', line: 'Huge electronics assembly base, mature-node chipmaking and AT&S substrate plants.', layers: ['systems', 'foundry', 'packaging'] },
  { id: 'malaysia', country: 'Malaysia', lat: 4.2, lon: 101.9, accent: 'amber', line: 'A hub for chip assembly and test; home to AT&S’s newer IC substrate plant in Kulim.', layers: ['packaging'] },
]

/* ------------------------------------------------------------------ */
/* 7. Glossary                                                         */
/* ------------------------------------------------------------------ */

export interface GlossaryTerm {
  term: string
  definition: string
  related?: string[]
}

export const glossary: GlossaryTerm[] = [
  { term: 'Wafer', definition: 'A thin, polished disc of ultra-pure crystalline silicon (commonly 300 mm across) on which many chips are built at once.', related: ['Die'] },
  { term: 'Die', definition: 'One individual chip cut from a wafer. A wafer holds anywhere from a few dozen large dies (like AI GPUs) to thousands of small ones.', related: ['Wafer', 'Yield'] },
  { term: 'Node (nm)', definition: 'A label for a generation of manufacturing technology, such as “3 nm”. Smaller numbers mean newer, denser processes. Today the number is a marketing name, not a literal measurement of any feature.', related: ['Lithography'] },
  { term: 'Lithography', definition: 'Printing circuit patterns onto a wafer with light. Light shines through (or reflects off) a mask and projects the pattern onto a light-sensitive coating.', related: ['EUV'] },
  { term: 'EUV', definition: 'Extreme Ultraviolet lithography, using light with a 13.5 nm wavelength to print the finest features. Only ASML makes EUV machines.', related: ['High-NA', 'Lithography'] },
  { term: 'High-NA', definition: 'The next generation of EUV machines. A higher “numerical aperture” lets the optics capture more light and print even smaller features.', related: ['EUV'] },
  { term: 'Fab', definition: 'Short for fabrication plant: the cleanroom factory where chips are manufactured on wafers.', related: ['Foundry'] },
  { term: 'Foundry', definition: 'A company that manufactures chips designed by other companies, such as TSMC.', related: ['Fabless', 'Fab'] },
  { term: 'Fabless', definition: 'A chip company that designs chips but outsources manufacturing to a foundry, such as NVIDIA, AMD or Qualcomm.', related: ['Foundry', 'IDM'] },
  { term: 'IDM', definition: 'Integrated Device Manufacturer: a company that both designs and manufactures its own chips, such as Intel or Texas Instruments.', related: ['Fabless'] },
  { term: 'EDA', definition: 'Electronic Design Automation: the specialised software used to design, simulate and verify chips. Main vendors are Synopsys, Cadence and Siemens.' },
  { term: 'HBM', definition: 'High Bandwidth Memory: several DRAM dies stacked vertically and connected with tiny vertical wires, placed right next to a GPU to feed it data very quickly.', related: ['Interposer', 'CoWoS'] },
  { term: 'Interposer', definition: 'A thin slice of silicon (or other material) that sits between chips and the substrate, providing ultra-dense wiring so a GPU and its HBM can talk at high speed.', related: ['CoWoS', 'IC substrate'] },
  { term: 'IC substrate', definition: 'A miniature, multilayer circuit board that a chip is mounted on. It fans out thousands of tiny connections from the die to the wider spacing of the main board. AT&S is a maker.', related: ['ABF'] },
  { term: 'ABF', definition: 'Ajinomoto Build-up Film: a thin insulating film used between the copper layers of high-end IC substrates. Supplied by Japan’s Ajinomoto.', related: ['IC substrate'] },
  { term: 'CoWoS', definition: 'Chip-on-Wafer-on-Substrate: TSMC’s advanced packaging technology that places a GPU and HBM stacks on an interposer, then onto a substrate. Used for many AI accelerators.', related: ['Interposer', 'HBM'] },
  { term: 'OSAT', definition: 'Outsourced Semiconductor Assembly and Test: companies like ASE and Amkor that package and test chips for others.' },
  { term: 'Yield', definition: 'The share of chips on a wafer that work as intended. Higher yield means lower cost per good chip — a key measure of manufacturing skill.', related: ['Die'] },
  { term: 'CUDA', definition: 'NVIDIA’s software platform for programming its GPUs. Years of developer tools and libraries built on CUDA are a major reason customers stay with NVIDIA.' },
]

/* ------------------------------------------------------------------ */
/* 8. Quiz                                                             */
/* ------------------------------------------------------------------ */

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  /** Index into options. */
  answer: number
  explanation: string
}

export const quiz: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What does a “fabless” company like NVIDIA do?',
    options: ['Builds and runs its own chip factories', 'Designs chips but outsources manufacturing', 'Makes lithography machines', 'Only sells chip-design software'],
    answer: 1,
    explanation: 'Fabless companies focus on design and pay foundries such as TSMC to manufacture their chips.',
  },
  {
    id: 'q2',
    question: 'Which company is the only supplier of EUV lithography machines?',
    options: ['TSMC', 'Intel', 'ASML', 'Applied Materials'],
    answer: 2,
    explanation: 'ASML in the Netherlands is the sole maker of EUV lithography systems.',
  },
  {
    id: 'q3',
    question: 'What does an IC substrate (the kind AT&S makes) do?',
    options: ['Stores data for the GPU', 'Generates EUV light', 'Routes connections from the tiny chip out to the circuit board', 'Cools the chip with liquid'],
    answer: 2,
    explanation: 'The substrate is a miniature multilayer board that fans out thousands of microscopic connections to the board.',
  },
  {
    id: 'q4',
    question: 'Why is HBM so important for AI chips?',
    options: ['It makes the chip waterproof', 'It feeds data to the GPU very fast, right next to it', 'It replaces the need for a foundry', 'It is a type of lithography'],
    answer: 1,
    explanation: 'AI workloads are often limited by memory speed. HBM stacks DRAM next to the GPU for very high bandwidth.',
  },
  {
    id: 'q5',
    question: 'Which business model is typically the MOST capital-intensive?',
    options: ['Fabless designer', 'EDA software vendor', 'Leading-edge foundry', 'IP licensing company'],
    answer: 2,
    explanation: 'A leading-edge foundry must build and equip fabs that cost tens of billions of dollars (approx.).',
  },
  {
    id: 'q6',
    question: 'What is “yield”?',
    options: ['The share of chips on a wafer that work', 'The speed of a chip', 'A company’s dividend', 'The wavelength of EUV light'],
    answer: 0,
    explanation: 'Yield is the fraction of good dies per wafer. Higher yield means lower cost per working chip.',
  },
  {
    id: 'q7',
    question: 'What is a major part of NVIDIA’s “moat” beyond its hardware?',
    options: ['Owning sand mines', 'Its CUDA software ecosystem', 'Making its own EUV machines', 'Running the world’s largest foundry'],
    answer: 1,
    explanation: 'CUDA and the tools built on it make it costly for developers to switch to other chips.',
  },
  {
    id: 'q8',
    question: 'Where is most leading-edge chip manufacturing concentrated today?',
    options: ['Austria', 'Taiwan', 'Netherlands', 'Brazil'],
    answer: 1,
    explanation: 'TSMC’s most advanced fabs are mainly in Taiwan, which is why it is seen as a strategic chokepoint.',
  },
]

export const quizVerdicts: { min: number; title: string; body: string }[] = [
  { min: 8, title: 'Fab-grade perfection', body: 'A flawless yield. You could brief a board on the chip supply chain.' },
  { min: 6, title: 'High yield', body: 'Strong understanding of the stack. Revisit the sections you missed to polish it.' },
  { min: 4, title: 'Promising process', body: 'You have the basics. The Stack and Glossary sections will fill the gaps.' },
  { min: 0, title: 'Back to the cleanroom', body: 'No problem — scroll back up, explore the layers, and try again.' },
]
