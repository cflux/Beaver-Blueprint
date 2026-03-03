import { Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { useApi } from '../hooks/useApi';

interface BreadcrumbProps {
  slug: string;
  items?: { label: string; to?: string }[];
}

export function Breadcrumb({ slug, items = [] }: BreadcrumbProps) {
  const { data: project } = useApi(() => projectsApi.get(slug), [slug]);
  const projectName = project?.name ?? slug;

  return (
    <div className="text-sm text-gray-500 mb-4">
      <Link to="/" className="hover:text-primary-600">Dashboard</Link>
      <span className="mx-2">/</span>
      <Link to={`/projects/${slug}`} className="hover:text-primary-600">{projectName}</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span className="mx-2">/</span>
          {item.to ? (
            <Link to={item.to} className="hover:text-primary-600">{item.label}</Link>
          ) : (
            <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
