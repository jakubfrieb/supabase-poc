export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Facilities: undefined;
  Notifications: undefined;
  Profile: undefined;
  JoinFacility: undefined;
  CreateFacility: undefined;
  EditFacility: { facilityId: string };
  FacilityDetail: { facilityId: string };
  CreateIssue: { facilityId: string };
  IssueDetail: { issueId: string; facilityId: string };
  EditIssue: { issueId: string; facilityId: string };
};
