const source=(id,url,excerpt)=>({id,url,excerpt,retrievedAt:'2026-10-06',kind:'reviewed_public',publisher:'provider'});
const id='REV-ONBOARD-2026-10-06';
export const revolutResearchRoute={
 routeId:'revolut-pt-business-online',bank:'Revolut Business',routeName:'Business online onboarding · PT product baseline',channel:'online',coverage:'partial',eligibilityRules:[],officialDomains:['revolut.com'],searchQuery:'Revolut Portugal business onboarding documents legal entities eligibility',
 scopeNote:'Public PT product guide only. Confirm supported legal form, activity, registered/operating address, applicant authority and all owner checks. Acceptance and Portuguese reference/tax payments remain unverified.',
 sources:[source(id,'https://www.revolut.com/en-PT/business/business-resources-onboarding-guide/','Identity, company details, registered and operating address, business activity and controlling officer/shareholder verification. Ownership breakdown for stakes at least 25%. Document alternatives and date limits require review; not a complete checklist.'),source('REV-ONLINE-2026-10-06','https://www.revolut.com/en-PT/business/','Business account signup is available online; supported legal forms are listed during signup. Provider approval remains separate.')],
 requirements:[
  {id:'REV-IDENTITY',sourceId:id,label:'Applicant government ID or residence permit; confirm eligibility and identity details',evidenceType:'representative_id',evidenceKinds:['representative_id','residence_permit'],subject:'Sofia Costa',conditional:true},
  {id:'REV-REGISTRATION',sourceId:id,label:'Company incorporation details and accepted verification alternative; review applicable date limit',evidenceType:'commercial_registration',evidenceKinds:['commercial_registration','articles'],subject:'company',conditional:true},
  {id:'REV-ADDRESS',sourceId:id,label:'Registered and operating addresses; verification alternatives differ',evidenceType:'address',subject:'company',conditional:true},
  {id:'REV-ACTIVITY',sourceId:id,label:'Nature of business and accepted supporting evidence; a description alone may be insufficient',evidenceType:'activity_description',subject:'company',conditional:true},
  {id:'REV-OWNERS',sourceId:id,label:'Controlling officer and shareholder checks; ownership and voting rights through UBOs at or above 25%',evidenceType:'ownership_declaration',subject:'company',conditional:true},
  {id:'REV-SCOPE',sourceId:id,label:'Confirm legal form, activity, applicant authority and complete provider checklist',evidenceType:'route_scope_review',subject:'company',conditional:true}
 ]
};
