import Punches from "@/pages/Punches";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/punches" component={Punches} />
        <Route path="/missions" component={Missions} />
        <Route path="/leaves" component={Leaves} />
        <Route path="/import" component={ImportData} />
        <Route path="/special-cases" component={SpecialCases} />
        <Route path="/reports" component={Reports} />
        <Route path="/employees" component={Employees} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
