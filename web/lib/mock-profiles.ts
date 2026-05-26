import type { Profile } from "@/lib/profile";

export const MOCK_PROFILES: Profile[] = [
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    email: "priya.sharma@ntu.edu.sg",
    contact: "@priya_ml on Telegram",
    linksRaw:
      "https://scholar.google.com/citations?user=priya\nhttps://github.com/priyasharma-lab\nhttps://priyasharma.dev",
    links: [
      {
        label: "Google Scholar",
        url: "https://scholar.google.com/citations?user=priya",
      },
      { label: "GitHub", url: "https://github.com/priyasharma-lab" },
      { label: "Personal site", url: "https://priyasharma.dev" },
      { label: "IP Query", url: "priya.sharma@ntu.edu.sg" }
    ],
    summary:
      "ML researcher focused on efficient transformers and on-device inference for robotics. Open to collaborating with founders building perception stacks for warehouse automation.",
    role: "researcher",
    tags: [
      "machine-learning",
      "robotics",
      "computer-vision",
      "transformers",
      "edge",
      "warehouse",
    ],
  },
  {
    id: "marcus-tan",
    name: "Marcus Tan",
    email: "marcus@logistream.sg",
    contact: "marcus.tan@logistream.sg",
    linksRaw:
      "https://logistream.sg\nhttps://linkedin.com/in/marcustan\nhttps://github.com/marcustan-logi",
    links: [
      { label: "LogiStream", url: "https://logistream.sg" },
      {
        label: "LinkedIn",
        url: "https://linkedin.com/in/marcustan",
      },
      { label: "GitHub", url: "https://github.com/marcustan-logi" },
    ],
    summary:
      "Founder building AI routing for last-mile logistics in Southeast Asia. Looking for researchers in reinforcement learning, fleet optimization, and computer vision for parcel scanning.",
    role: "founder",
    tags: [
      "logistics",
      "reinforcement-learning",
      "optimization",
      "computer-vision",
      "startup",
      "southeast-asia",
    ],
  },
  {
    id: "elena-voss",
    name: "Elena Voss",
    email: "elena.voss@ethz.ch",
    contact: "+41 79 555 0123",
    linksRaw:
      "https://ethz.ch/en/the-eth-zurich/people/person-detail.elena-voss\nhttps://arxiv.org/search/?query=elena+voss+biotech",
    links: [
      {
        label: "ETH profile",
        url: "https://ethz.ch/en/the-eth-zurich/people/person-detail.elena-voss",
      },
      {
        label: "arXiv",
        url: "https://arxiv.org/search/?query=elena+voss+biotech",
      },
      { label: "IP Query", url: "elena.voss@ethz.ch" }
    ],
    summary:
      "Synthetic biology researcher working on programmable microbes for carbon capture. Interested in deeptech founders translating lab protocols into pilot-scale bioreactors.",
    role: "researcher",
    tags: [
      "synthetic-biology",
      "carbon-capture",
      "bioreactors",
      "deeptech",
      "climate",
    ],
  },
  {
    id: "jordan-lee",
    name: "Jordan Lee",
    email: "jordan@carbonloop.io",
    contact: "jordan@carbonloop.io",
    linksRaw:
      "https://carbonloop.io\nhttps://linkedin.com/in/jordanlee-climate",
    links: [
      { label: "CarbonLoop", url: "https://carbonloop.io" },
      {
        label: "LinkedIn",
        url: "https://linkedin.com/in/jordanlee-climate",
      },
    ],
    summary:
      "Climate tech founder commercializing modular bioreactors for industrial CO2 utilization. Seeking academic partners in metabolic engineering and process control.",
    role: "founder",
    tags: [
      "climate",
      "bioreactors",
      "metabolic-engineering",
      "industrial",
      "carbon",
      "startup",
    ],
  },
  {
    id: "amir-hassan",
    name: "Amir Hassan",
    email: "amir.hassan@ntu.edu.sg",
    contact: "amir.hassan@ntu.edu.sg",
    linksRaw:
      "https://amirhassan-lab.ntu.edu.sg\nhttps://github.com/amirhassan-ntu",
    links: [
      {
        label: "Lab site",
        url: "https://amirhassan-lab.ntu.edu.sg",
      },
      { label: "GitHub", url: "https://github.com/amirhassan-ntu" },
      { label: "IP Query", url: "amir.hassan@ntu.edu.sg" }
    ],
    summary:
      "HCI and accessibility researcher studying assistive interfaces for neurodiverse learners. Happy to advise edtech startups on inclusive product design and user studies.",
    role: "researcher",
    tags: [
      "hci",
      "accessibility",
      "edtech",
      "inclusive-design",
      "user-studies",
    ],
  },
  {
    id: "sofia-ng",
    name: "Sofia Ng",
    email: "sofia@learnpath.app",
    contact: "@sofia_ng on WhatsApp",
    linksRaw: "https://learnpath.app\nhttps://linkedin.com/in/sofia-ng-edtech",
    links: [
      { label: "LearnPath", url: "https://learnpath.app" },
      {
        label: "LinkedIn",
        url: "https://linkedin.com/in/sofia-ng-edtech",
      },
    ],
    summary:
      "Edtech founder building adaptive learning paths for vocational schools. Looking for HCI researchers and learning scientists for pilots in Singapore and Malaysia.",
    role: "founder",
    tags: [
      "edtech",
      "adaptive-learning",
      "hci",
      "vocational",
      "singapore",
      "startup",
    ],
  },
];
