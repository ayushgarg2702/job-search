export type LearnResource = {
  label: string;
  url: string;
  kind: "video" | "course" | "docs" | "practice";
};

/**
 * Real free sites/videos to learn and practice common India SDE skills.
 * Used as the offline source of truth; Cursor may add more when available.
 */
const BY_SKILL: Record<string, LearnResource[]> = {
  JavaScript: [
    { kind: "course", label: "javascript.info", url: "https://javascript.info/" },
    { kind: "video", label: "Namaste JavaScript (YouTube)", url: "https://www.youtube.com/playlist?list=PLlasXeu85E9cQ32g8KwN7BmOp6R6mQAyT" },
    { kind: "practice", label: "JS30 exercises", url: "https://javascript30.com/" },
  ],
  TypeScript: [
    { kind: "docs", label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
    { kind: "video", label: "TypeScript crash course (Traversy)", url: "https://www.youtube.com/watch?v=BCg4U1FzODs" },
    { kind: "practice", label: "Type Challenges", url: "https://github.com/type-challenges/type-challenges" },
  ],
  React: [
    { kind: "docs", label: "React docs (Learn)", url: "https://react.dev/learn" },
    { kind: "video", label: "React official tutorial playlist", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr" },
    { kind: "practice", label: "React challenges on Scrimba", url: "https://scrimba.com/learn/learnreact" },
  ],
  "Next.js": [
    { kind: "docs", label: "Next.js Learn", url: "https://nextjs.org/learn" },
    { kind: "video", label: "Next.js App Router (Vercel)", url: "https://www.youtube.com/watch?v=gSSsZReIFRk" },
  ],
  "Node.js": [
    { kind: "docs", label: "Node.js guides", url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs" },
    { kind: "video", label: "Node.js crash course", url: "https://www.youtube.com/watch?v=fBNz5xF-Kx4" },
    { kind: "practice", label: "NodeSchool workshops", url: "https://nodeschool.io/" },
  ],
  Python: [
    { kind: "docs", label: "Python tutorial", url: "https://docs.python.org/3/tutorial/" },
    { kind: "video", label: "Python for beginners (freeCodeCamp)", url: "https://www.youtube.com/watch?v=rfscVS0vtbw" },
    { kind: "practice", label: "Exercism Python track", url: "https://exercism.org/tracks/python" },
  ],
  Django: [
    { kind: "docs", label: "Django tutorial", url: "https://docs.djangoproject.com/en/stable/intro/tutorial01/" },
    { kind: "video", label: "Django full course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=F5mRW0jo-U4" },
  ],
  Java: [
    { kind: "docs", label: "Oracle Java tutorials", url: "https://docs.oracle.com/javase/tutorial/" },
    { kind: "video", label: "Java full course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=xk4_1vUNSEE" },
    { kind: "practice", label: "Exercism Java track", url: "https://exercism.org/tracks/java" },
  ],
  Spring: [
    { kind: "docs", label: "Spring Boot guides", url: "https://spring.io/guides" },
    { kind: "video", label: "Spring Boot crash course", url: "https://www.youtube.com/watch?v=vtPkZShrvXQ" },
  ],
  Go: [
    { kind: "docs", label: "A Tour of Go", url: "https://go.dev/tour/" },
    { kind: "video", label: "Go full course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=YS4e4q9oBaU" },
    { kind: "practice", label: "Go by Example", url: "https://gobyexample.com/" },
  ],
  Rust: [
    { kind: "docs", label: "The Rust Book", url: "https://doc.rust-lang.org/book/" },
    { kind: "practice", label: "Rustlings", url: "https://github.com/rust-lang/rustlings" },
  ],
  SQL: [
    { kind: "practice", label: "SQLBolt", url: "https://sqlbolt.com/" },
    { kind: "practice", label: "LeetCode Database", url: "https://leetcode.com/problemset/database/" },
    { kind: "video", label: "SQL full course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY" },
  ],
  MongoDB: [
    { kind: "docs", label: "MongoDB University free courses", url: "https://learn.mongodb.com/" },
    { kind: "video", label: "MongoDB crash course", url: "https://www.youtube.com/watch?v=-56x56UppqQ" },
  ],
  Redis: [
    { kind: "docs", label: "Redis University", url: "https://university.redis.io/" },
    { kind: "docs", label: "Redis docs: Getting started", url: "https://redis.io/docs/latest/get-started/" },
  ],
  Kafka: [
    { kind: "docs", label: "Kafka quickstart", url: "https://kafka.apache.org/quickstart" },
    { kind: "video", label: "Kafka explained (Confluent)", url: "https://www.youtube.com/watch?v=UZw2c4ykgdU" },
  ],
  Elasticsearch: [
    { kind: "docs", label: "Elasticsearch getting started", url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html" },
  ],
  "REST APIs": [
    { kind: "docs", label: "MDN: HTTP overview", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" },
    { kind: "practice", label: "Public APIs to practice against", url: "https://github.com/public-apis/public-apis" },
  ],
  Microservices: [
    { kind: "video", label: "Microservices explained (IBM)", url: "https://www.youtube.com/watch?v=CdHt_y5lGw8" },
    { kind: "docs", label: "Microsoft: Microservices architecture", url: "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices" },
  ],
  "System design": [
    { kind: "course", label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
    { kind: "video", label: "System Design Interview playlist (ByteByteGo)", url: "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VHXkWxhBh" },
    { kind: "practice", label: "Practice prompts (Gaurav Sen / YouTube)", url: "https://www.youtube.com/@gkcs" },
  ],
  AWS: [
    { kind: "docs", label: "AWS Skill Builder free", url: "https://skillbuilder.aws/" },
    { kind: "video", label: "AWS Certified Cloud Practitioner (freeCodeCamp)", url: "https://www.youtube.com/watch?v=SOTamWNgDKc" },
    { kind: "practice", label: "AWS Free Tier labs", url: "https://aws.amazon.com/free/" },
  ],
  GCP: [
    { kind: "docs", label: "Google Cloud Skills Boost", url: "https://www.cloudskillsboost.google/" },
    { kind: "video", label: "GCP overview (Google Cloud Tech)", url: "https://www.youtube.com/watch?v=4D3Xmpz0NjI" },
  ],
  Azure: [
    { kind: "docs", label: "Microsoft Learn: Azure", url: "https://learn.microsoft.com/en-us/training/azure/" },
  ],
  Docker: [
    { kind: "docs", label: "Docker getting started", url: "https://docs.docker.com/get-started/" },
    { kind: "video", label: "Docker tutorial (TechWorld with Nana)", url: "https://www.youtube.com/watch?v=3c-iBn73dDE" },
    { kind: "practice", label: "Play with Docker", url: "https://labs.play-with-docker.com/" },
  ],
  Kubernetes: [
    { kind: "docs", label: "Kubernetes basics tutorial", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" },
    { kind: "video", label: "Kubernetes course (TechWorld with Nana)", url: "https://www.youtube.com/watch?v=X48VuDVv0do" },
    { kind: "practice", label: "Killercoda K8s playgrounds", url: "https://killercoda.com/kubernetes" },
  ],
  "CI/CD": [
    { kind: "docs", label: "GitHub Actions docs", url: "https://docs.github.com/en/actions" },
    { kind: "video", label: "GitHub Actions tutorial", url: "https://www.youtube.com/watch?v=R8_veQiYBjI" },
  ],
  "Data structures & algorithms": [
    { kind: "practice", label: "LeetCode", url: "https://leetcode.com/problemset/" },
    { kind: "practice", label: "NeetCode roadmap", url: "https://neetcode.io/roadmap" },
    { kind: "video", label: "Abdul Bari algorithms", url: "https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-s86H_aP4ln1" },
  ],
  Testing: [
    { kind: "docs", label: "Jest docs", url: "https://jestjs.io/docs/getting-started" },
    { kind: "docs", label: "Playwright docs", url: "https://playwright.dev/docs/intro" },
    { kind: "video", label: "Testing JavaScript (Kent C. Dodds intro)", url: "https://www.youtube.com/watch?v=7dTTFW7yACQ" },
  ],
  GraphQL: [
    { kind: "docs", label: "GraphQL Learn", url: "https://graphql.org/learn/" },
    { kind: "practice", label: "GraphQL mini Chrome extension / playground", url: "https://graphql.org/swapi-graphql" },
  ],
  "Machine learning": [
    { kind: "course", label: "fast.ai Practical Deep Learning", url: "https://course.fast.ai/" },
    { kind: "course", label: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course" },
  ],
  "LLMs / GenAI": [
    { kind: "course", label: "DeepLearning.AI short courses", url: "https://www.deeplearning.ai/short-courses/" },
    { kind: "docs", label: "OpenAI API quickstart", url: "https://platform.openai.com/docs/quickstart" },
  ],
  Linux: [
    { kind: "practice", label: "OverTheWire Bandit", url: "https://overthewire.org/wargames/bandit/" },
    { kind: "video", label: "Linux for beginners", url: "https://www.youtube.com/watch?v=sWbUDq4S6Y8" },
  ],
  Git: [
    { kind: "docs", label: "Pro Git book (free)", url: "https://git-scm.com/book/en/v2" },
    { kind: "practice", label: "Learn Git Branching", url: "https://learngitbranching.js.org/" },
  ],
  Terraform: [
    { kind: "docs", label: "HashiCorp Terraform tutorials", url: "https://developer.hashicorp.com/terraform/tutorials" },
  ],
};

const GENERIC: LearnResource[] = [
  { kind: "practice", label: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/" },
  { kind: "practice", label: "Exercism", url: "https://exercism.org/" },
  { kind: "video", label: "freeCodeCamp YouTube", url: "https://www.youtube.com/@freecodecamp" },
];

function normalizeKey(skill: string): string {
  return skill.trim().toLowerCase();
}

const INDEX = new Map<string, LearnResource[]>();
for (const [skill, resources] of Object.entries(BY_SKILL)) {
  INDEX.set(normalizeKey(skill), resources);
  for (const part of skill.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 2)) {
    if (!INDEX.has(part)) INDEX.set(part, resources);
  }
}

/** Look up curated videos / docs / practice sites for a skill name. */
export function resourcesForSkill(skill: string): LearnResource[] {
  const key = normalizeKey(skill);
  if (INDEX.has(key)) return INDEX.get(key)!;
  for (const [k, resources] of INDEX) {
    if (key.includes(k) || k.includes(key)) return resources;
  }
  // Search-friendly fallbacks so every skill still has somewhere to go
  const q = encodeURIComponent(`${skill} tutorial`);
  return [
    { kind: "video", label: `YouTube: ${skill} tutorials`, url: `https://www.youtube.com/results?search_query=${q}` },
    { kind: "practice", label: `Google: best free ${skill} course`, url: `https://www.google.com/search?q=${encodeURIComponent(`best free ${skill} course OR documentation OR practice`)}` },
    ...GENERIC.slice(0, 1),
  ];
}

export function mergeResources(skill: string, extra: LearnResource[] = []): LearnResource[] {
  const base = resourcesForSkill(skill);
  const seen = new Set(base.map((r) => r.url));
  const out = [...base];
  for (const r of extra) {
    if (!r.url?.startsWith("http") || seen.has(r.url)) continue;
    seen.add(r.url);
    out.push({ label: r.label || r.url, url: r.url, kind: r.kind || "docs" });
  }
  return out.slice(0, 6);
}
