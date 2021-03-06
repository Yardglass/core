'use strict';

const bcrypt = require('bcryptjs');
const adminController = require('../../../src/controllers/adminController');
const adminValidator = require('../../../src/lib/adminValidator');
const streamClient = require('../../../src/streamClient');
const store = require('../../../src/store');

describe('adminController', () => {
  let res;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    res = {
      sendStatus: sinon.spy(),
      json: sinon.spy(),
    };
    res.status = sinon.stub().returns(res);
    sandbox.stub(store, 'getAdmins').returns([
      { type: 'SUPER', id: 'admin-1', name: 'Luke', email: 'luke@rbl.io', phoneNumber: '123', password: 'enc' },
      { type: 'BRANCH', id: 'admin-2', name: 'Leia', email: 'leia@rbl.io', phoneNumber: '456', password: 'enc', branchId: 'branch-1' },
      { type: 'BRANCH', id: 'admin-3', name: 'Han', email: 'han@rbl.io', phoneNumber: '789', password: 'enc', branchId: 'branch-2' },
    ]);
    sandbox.stub(adminValidator, 'isValid').returns([]);
    sandbox.stub(adminValidator, 'isValidWithoutPassword').returns([]);
    sandbox.stub(streamClient, 'publish').resolves();
    sandbox.stub(bcrypt, 'hashSync').withArgs('super secret').returns('hashed password');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createAdmin', () => {
    it('puts an event on the stream when everything is valid, with the password hashed', () => {
      const req = {
        params: { branchId: 'some-branch' },
        body: {
          name: 'some name',
          email: 'some@email.com',
          phoneNumber: '98765432',
          password: 'super secret',
        },
      };

      return adminController.createAdmin('BRANCH')(req, res)
      .then(() => {
        const [eventType, eventData] = streamClient.publish.args[0];
        expect(eventType).to.eql('admin-created');
        expect(eventData.id).to.be.a('string');
        expect(eventData.name).to.eql('some name');
        expect(eventData.email).to.eql('some@email.com');
        expect(eventData.phoneNumber).to.eql('98765432');
        expect(eventData.password).to.eql('hashed password');
        expect(eventData.type).to.eql('BRANCH');
        expect(eventData.branchId).to.eql('some-branch');

        expect(res.status).to.have.been.calledWith(200);
        const [jsonData] = res.json.args[0];
        expect(jsonData.id).to.be.a('string');
        expect(jsonData.name).to.eql('some name');
        expect(jsonData.email).to.eql('some@email.com');
        expect(jsonData.phoneNumber).to.eql('98765432');
        expect(jsonData.type).to.eql('BRANCH');
        expect(jsonData.branchId).to.eql('some-branch');
      });
    });

    it('can create super admins too', () => {
      const req = {
        params: {},
        body: { name: 'some name', email: 'some@email.com', phoneNumber: '98765432', password: 'super secret' },
      };

      return adminController.createAdmin('SUPER')(req, res)
        .then(() => {
          const [eventType, eventData] = streamClient.publish.args[0];
          expect(eventType).to.eql('admin-created');
          expect(eventData.type).to.eql('SUPER');
          expect(eventData.branchId).to.eql(undefined);

          expect(res.status).to.have.been.calledWith(200);
          const [jsonData] = res.json.args[0];
          expect(jsonData.type).to.eql('SUPER');
          expect(jsonData.branchId).to.eql(undefined);
        });
    });

    it('fails when the payload is invalid', () => {
      const req = { params: { branchId: 'some-branch' }, body: {} };

      adminValidator.isValid.returns(['ba-bow']);

      adminController.createAdmin('BRANCH')(req, res);
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ errors: ['ba-bow'] });
    });

    it('fails when the stream client blows up', () => {
      const req = { params: { branchId: 'some-branch' }, body: {} };

      streamClient.publish.rejects();

      return adminController.createAdmin('BRANCH')(req, res)
        .then(() => {
          expect(res.sendStatus).to.have.been.calledWith(500);
        });
    });
  });

  describe('updateAdmin', () => {
    it('puts an event on the stream when everything is valid, with the password hashed', () => {
      const req = {
        params: { branchId: 'some-branch', adminId: 'some-admin' },
        body: {
          name: 'some name',
          email: 'some@email.com',
          phoneNumber: '98765432',
          password: 'super secret',
        },
      };

      return adminController.updateAdmin(req, res)
        .then(() => {
          expect(streamClient.publish).to.have.been.calledWith(
            'admin-edited',
            {
              id: 'some-admin',
              branchId: 'some-branch',
              name: 'some name',
              email: 'some@email.com',
              phoneNumber: '98765432',
              password: 'hashed password',
            }
          );
          expect(res.status).to.have.been.calledWith(200);
          expect(res.json).to.have.been.calledWith({
            id: 'some-admin',
            branchId: 'some-branch',
            name: 'some name',
            email: 'some@email.com',
            phoneNumber: '98765432',
          });
        });
    });

    it('can update without a branchId, which super admins do not have', () => {
      const req = { params: { adminId: 'some-admin' }, body: {} };

      return adminController.updateAdmin(req, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          const [eventType, eventData] = streamClient.publish.args[0];
          expect(eventType).to.eql('admin-edited');
          expect(eventData.branchId).to.eql(undefined);
        });
    });

    it('can update the admin without changing their password', () => {
      const req = { params: { adminId: 'some-admin' }, body: {} };

      return adminController.updateAdmin(req, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          const [eventType, eventData] = streamClient.publish.args[0];
          expect(eventType).to.eql('admin-edited');
          expect(eventData.password).to.eql(undefined);
        });
    });

    it('fails when the payload is invalid', () => {
      const req = { params: { adminId: 'some-admin' }, body: { bad: 'data' } };

      adminValidator.isValidWithoutPassword.returns(['oh no!']);

      adminController.updateAdmin(req, res);
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ errors: ['oh no!'] });
    });

    it('fails when the streamClient blows up', () => {
      const req = { params: { adminId: 'some-admin' }, body: {} };

      streamClient.publish.rejects();

      return adminController.updateAdmin(req, res)
        .then(() => {
          expect(res.sendStatus).to.have.been.calledWith(500);
        });
    });
  });

  describe('deleteAdmin', () => {
    it('puts an event on the stream', () => {
      const req = { params: { adminId: 'some-admin' } };

      return adminController.deleteAdmin(req, res)
        .then(() => {
          expect(res.sendStatus).to.have.been.calledWith(200);
          expect(streamClient.publish).to.have.been.calledWith('admin-removed', { id: 'some-admin' });
        });
    });

    it('fails if the stream client blows up', () => {
      const req = { params: { adminId: 'some-admin' } };

      streamClient.publish.rejects();

      return adminController.deleteAdmin(req, res)
        .then(() => {
          expect(res.sendStatus).to.have.been.calledWith(500);
        });
    });
  });

  describe('getBranchAdmins', () => {
    it('sends back all the admins for the given branch', () => {
      const req = { params: { branchId: 'branch-1' } };

      adminController.getBranchAdmins(req, res);

      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith({
        admins: [{ id: 'admin-2', name: 'Leia', email: 'leia@rbl.io', phoneNumber: '456' }],
      });
    });
  });

  describe('getSuperAdmins', () => {
    it('sends back all of the super admins', () => {
      adminController.getSuperAdmins({}, res);
      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith({
        admins: [
          { id: 'admin-1', name: 'Luke', email: 'luke@rbl.io', phoneNumber: '123' },
        ],
      });
    });
  });
});
