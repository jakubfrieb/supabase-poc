export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Facilities: undefined;
  CreateFacility: undefined;
  EditFacility: { facilityId: string };
  FacilityDetail: { facilityId: string };
  CreateIssue: { facilityId: string };
  IssueDetail: { issueId: string; facilityId: string };
  EditIssue: { issueId: string; facilityId: string };
};
