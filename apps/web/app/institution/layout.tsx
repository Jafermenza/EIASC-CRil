import InstitutionShell from '../../components/layout/institution-shell';

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return <InstitutionShell>{children}</InstitutionShell>;
}
