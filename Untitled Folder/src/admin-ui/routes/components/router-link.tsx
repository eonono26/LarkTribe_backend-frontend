import Link from 'next/link';

// ----------------------------------------------------------------------

type RouterLinkProps = Omit<React.ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export function RouterLink({ href, ...other }: RouterLinkProps) {
  return <Link href={href} {...other} />;
}
