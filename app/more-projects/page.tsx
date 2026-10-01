import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Related Projects - Chat Playground',
  description: 'Explore more projects by Bookchaowalit. Discover our collection of web applications and tools.',
  keywords: ['related projects', 'more apps', 'Bookchaowalit', 'web applications'],
  alternates: { canonical: '/more-projects' },
  openGraph: {
    title: 'Related Projects - Chat Playground',
    description: 'Explore more projects by Bookchaowalit',
    type: 'website',
  },
};

type RelatedProject = { name: string; url: string };
type ProjectCategory = { category: string; projects: RelatedProject[] };

const CATEGORIES: ProjectCategory[] = [
  {
    "category": "productivity",
    "projects": [
      {
        "name": "Pomodoro Timer",
        "url": "https://bookchaowalit-pomodoro-timer-fronte.vercel.app"
      },
      {
        "name": "Habit Tracker",
        "url": "https://bookchaowalit-habit-tracker-frontend.vercel.app"
      },
      {
        "name": "Goal Tracker",
        "url": "https://bookchaowalit-goal-tracker-frontend.vercel.app"
      },
      {
        "name": "Time Tracker",
        "url": "https://bookchaowalit-time-tracker-frontend.vercel.app"
      },
      {
        "name": "Todo Board",
        "url": "https://bookchaowalit-todo-board-frontend.vercel.app"
      },
      {
        "name": "Calendar App",
        "url": "https://bookchaowalit-calendar-app-frontend.vercel.app"
      },
      {
        "name": "Reminders",
        "url": "https://bookchaowalit-reminders-frontend.vercel.app"
      }
    ]
  },
  {
    "category": "dev tools",
    "projects": [
      {
        "name": "JSON Converter",
        "url": "https://bookchaowalit-jsonconverter-frontend.vercel.app"
      },
      {
        "name": "Base64 Encoder",
        "url": "https://bookchaowalit-base64-frontend.vercel.app"
      },
      {
        "name": "Regex Tester",
        "url": "https://bookchaowalit-regex-frontend.vercel.app"
      },
      {
        "name": "Hash Generator",
        "url": "https://bookchaowalit-hashgen-frontend.vercel.app"
      },
      {
        "name": "Cron Expression",
        "url": "https://bookchaowalit-cron-frontend.vercel.app"
      },
      {
        "name": "Diff Checker",
        "url": "https://bookchaowalit-diffchecker-frontend.vercel.app"
      },
      {
        "name": "Minifier",
        "url": "https://bookchaowalit-minifier-frontend.vercel.app"
      },
      {
        "name": "URL Encoder",
        "url": "https://bookchaowalit-url-encoder-frontend.vercel.app"
      },
      {
        "name": "URL Shortener",
        "url": "https://bookchaowalit-url-shortener-frontend.vercel.app"
      },
      {
        "name": "Deep Links",
        "url": "https://bookchaowalit-deeplinks-frontend.vercel.app"
      }
    ]
  },
  {
    "category": "content tools",
    "projects": [
      {
        "name": "Markdown Editor",
        "url": "https://bookchaowalit-markdown-editor-frontend.vercel.app"
      },
      {
        "name": "Text Summarizer",
        "url": "https://bookchaowalit-text-summarizer-frontend.vercel.app"
      },
      {
        "name": "Quote Generator",
        "url": "https://bookchaowalit-quote-generator-front.vercel.app"
      },
      {
        "name": "Meme Generator",
        "url": "https://bookchaowalit-meme-generator-frontend.vercel.app"
      },
      {
        "name": "Number Converter",
        "url": "https://bookchaowalit-number-converter-frontend.vercel.app"
      },
      {
        "name": "Date Calculator",
        "url": "https://bookchaowalit-date-calculator-frontend.vercel.app"
      }
    ]
  },
  {
    "category": "webmaster",
    "projects": [
      {
        "name": "SEO Analyzer",
        "url": "https://bookchaowalit-seo-analyzer-frontend.vercel.app"
      },
      {
        "name": "Analytics Dashboard",
        "url": "https://bookchaowalit-analytics-dashboard-frontend.vercel.app"
      },
      {
        "name": "Uptime Monitor",
        "url": "https://bookchaowalit-uptime-monitor-frontend.vercel.app"
      },
      {
        "name": "Error Logs",
        "url": "https://bookchaowalit-error-logs-frontend.vercel.app"
      },
      {
        "name": "Redirect Manager",
        "url": "https://bookchaowalit-redirect-manager-frontend.vercel.app"
      },
      {
        "name": "Status Page",
        "url": "https://bookchaowalit-status-frontend.vercel.app"
      },
      {
        "name": "Popular Pages",
        "url": "https://bookchaowalit-popular-pages-frontend.vercel.app"
      },
      {
        "name": "Link Analytics",
        "url": "https://bookchaowalit-link-analytics-frontend.vercel.app"
      },
      {
        "name": "Webhook Tester",
        "url": "https://bookchaowalit-webhook-tester-frontend.vercel.app"
      }
    ]
  },
  {
    "category": "communication",
    "projects": [
      {
        "name": "Contact Forms",
        "url": "https://bookchaowalit-contact-forms-frontend.vercel.app"
      },
      {
        "name": "Newsletter",
        "url": "https://bookchaowalit-newsletter-frontend.vercel.app"
      },
      {
        "name": "Comments",
        "url": "https://bookchaowalit-comments-frontend.vercel.app"
      },
      {
        "name": "Guestbook",
        "url": "https://bookchaowalit-guestbook-frontend.vercel.app"
      }
    ]
  },
  {
    "category": "Main Sites",
    "projects": [
      {
        "name": "Portfolio",
        "url": "https://bookchaowalit.com"
      },
      {
        "name": "Blog",
        "url": "https://bookchaowalit-techblog-frontend.vercel.app"
      },
      {
        "name": "DevHub",
        "url": "https://bookchaowalit-devhub-frontend.vercel.app"
      },
      {
        "name": "Wiki",
        "url": "https://bookchaowalit-wiki-frontend.vercel.app"
      },
      {
        "name": "TechSpace",
        "url": "https://bookchaowalit-techspace-frontend.vercel.app"
      },
      {
        "name": "Tracking",
        "url": "https://bookchaowalit-tracking-frontend.vercel.app"
      },
      {
        "name": "Linktree",
        "url": "https://bookchaowalit-linktree-frontend.vercel.app"
      }
    ]
  }
];

function categoryLabel(category: string) {
  return category.replace(/-/g, ' ');
}

export default function RelatedProjectsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <p className="mb-6">
          <Link href="/" className="text-sm text-blue-700 underline dark:text-blue-300">
            ← Back to the app
          </Link>
        </p>
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          More Projects
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
          Explore our collection of web applications and tools
        </p>

        {CATEGORIES.map(({ category, projects }) => (
          <section key={category} className="mb-12" aria-labelledby={`category-${category}`}>
            <h2
              id={`category-${category}`}
              className="text-2xl font-bold mb-6 text-gray-900 dark:text-white capitalize"
            >
              {categoryLabel(category)}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <li key={project.url}>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                      {project.name}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 break-all">
                      {project.url} <span aria-hidden="true">→</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
