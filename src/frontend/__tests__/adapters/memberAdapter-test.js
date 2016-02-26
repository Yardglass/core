'use strict';
import memberAdapter from '../../adapters/memberAdapter.js';

describe('member request adapter', () => {

  describe('prepareNewMemberPayload', () => {

    let fields = {
      labSelection: 'i',
      contactName: 'g',
      contactLastName: 'h',
      contactNumber: 'd',
      contactEmail: 'c',
      childName: 'a',
      childLastName: 'b',
      childBirthYear: 'e',
      schoolType: 'f',
      additionalInfo: 'j'
    };

    let expectedPayload = {
      firstName: 'a',
      lastName: 'b',
      email: 'c',
      primaryPhoneNumber: 'd',
      dateOfBirth: 'e',
      schoolType: 'f',
      contactFirstName: 'g',
      contactLastName: 'h',
      branch: 'i',
      additionalInfo: 'j'
    };

    it('should convert to the correct fieldnames for the api', () => {
      let result = memberAdapter.prepareNewMemberPayload(fields);
      expect(result).toEqual(expectedPayload);
    });
  });
});
