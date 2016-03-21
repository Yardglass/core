import React, {Component} from 'react';
import {render} from 'react-dom';
import $ from 'jquery';
import _ from 'underscore';
import FilteredParticipantsList from './FilteredParticipantsList.jsx';
import AdminHeader from './AdminHeader.jsx';
import UserMessageView from './UserMessageView.jsx';
import GroupsView from './GroupsView.jsx';
import LabDetailsView from './LabDetailsView.jsx';
import OrganisersView from './OrganisersView.jsx';
import labService from '../../services/labService.js';
import groupService from '../../services/groupService.js';
import memberService from '../../services/memberService.js';
import { AdminDashboard as Strings } from '../../config/strings.js';

export default class AdminDashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            participants: [],
            groups: [],
            labs: [],
            selectedGroupId: 'unassigned',
            selectedLab: {},
            filteredParticipantList: [],
            userMessages: [],
            pageErrors: [],
            organisers: [],
            onSaveGroup: (groupDetails) => {
                this.clearMessages();
                let saveAction = this.state.groups.find(group => group.id === groupDetails.id) === undefined ? groupService.createGroup : groupService.updateGroup;
                saveAction(groupDetails, this.state.selectedLab.id)
                .then((savedGroup) => {
                    this.updateGroups(this.state.groups, savedGroup);
                    this.setUserMessage('Group successfully saved');
                })
                .catch(this.handleError.bind(this));
            },
            onSelectGroup: (selected) => {
                this.clearMessages();
                this.updateGroupSelection(selected);
                this.setState({selectedGroupId: selected});
            },
            onDeleteGroup: (selected) => {
                this.clearMessages();
                groupService.deleteGroup(selected, this.state.selectedLab.id)
                .then(()=> {
                    this.setState({groups: this.findAndRemoveGroup(this.state.groups, selected)});
                    this.setState({selectedGroupId: ''});
                    this.setUserMessage('Group successfully deleted');
                })
                .catch(this.handleError.bind(this));
            },
            onSaveParticipant: (participant) => {
                this.clearMessages();
                memberService.update(participant, this.state.selectedLab.id)
                    .then((savedParticipant) => {
                        this.updateParticipants(this.state.participants, savedParticipant);
                        this.setUserMessage('Participant successfully saved');
                    })
                    .catch(this.handleError.bind(this));
            },
            onSelectLab: (id) => {
                let lab = this.state.labs.find(lab => lab.id === id);
                this.updateLabSelection(lab);
            }
        };
    }

    clearMessages() {
        this.setState({userMessages: []});
        this.setState({pageErrors: []});
    }

    handleError() {
        let pageErrors = this.state.pageErrors.slice(0);
        pageErrors.push(Strings.RemoteSaveErrorMessage);
        this.setState({pageErrors: pageErrors});
    }

    setUserMessage(message) {
        let userMessages = this.state.userMessages.slice(0);
        userMessages.push(message);
        this.setState({userMessages: userMessages});
    }

    updateGroupSelection(selected) {
        let groups = this.state.groups.map(group => {
            return Object.assign({}, group, { selected: group.id === selected });
        });
        this.setState({groups: groups});
    }

    updateGroups(collection, element) {
        this.updateElements('groups', collection, element);
    }

    updateParticipants(collection, element) {
        this.updateElements('participants', collection, element);
    }

    updateElements(collectionName, collection, element) {
        let newElements = collection.slice(0);
        let oldElement = newElements.find (g => g.id === element.id);
        if(oldElement) {
            Object.assign(oldElement, element);
        }
        else {
            newElements.push(element);
        }
        let state = {};
        state[collectionName] = newElements;
        this.setState(state);
    }

    findAndRemoveGroup(groups, selected) {
        let group = groups.find(group => group.id === selected.id);
        return _.without(groups, group);
    }

    componentDidMount() {
        labService.getMyLabs()
            .then( (labs) => {
                this.setState({labs: labs});
                this.updateLabSelection(labs[0]);
            });
    }

    updateLabSelection(lab) {
        this.setState({selectedLab: lab});
        labService.getLabParticipants(lab.id)
                .then( participants => { this.setState({participants: participants});
                                         this.filterParticipantList();
                                        });
        labService.getLabGroups(lab.id)
                .then( groups => { this.setState({groups: groups}); });
        labService.getOrganisers(lab.id)
                .then( organisers => {this.setState({organisers: organisers})});
    }

    getSelectedGroup() {
        if(this.state.selectedGroupId === 'all' || this.state.selectedGroupId === 'unassigned') {
            return;
        }
        return this.state.groups.find(group => group.id === this.state.selectedGroupId);
    }

    render() {
        return (
            <div className="admin-container">
                <AdminHeader selectedLab={this.state.selectedLab} labs={this.state.labs} onSelectLab={this.state.onSelectLab}/>
                <UserMessageView
                    messages={this.state.userMessages}
                    errors={this.state.pageErrors}
                />
            <LabDetailsView
                    selectedLab={this.state.selectedLab}
                />

            <OrganisersView
                    organisers={this.state.organisers}
                />
                <GroupsView
                    selectedGroup={this.getSelectedGroup()}
                    groups={this.state.groups}
                    onSaveGroup={this.state.onSaveGroup}
                    onDeleteGroup={this.state.onDeleteGroup}
                    onSelectGroup={this.state.onSelectGroup}
                />
                <FilteredParticipantsList
                        groupFilter={ this.state.selectedGroupId }
                        groups={ this.state.groups }
                        participants={ this.state.participants }
                        onSaveParticipant= { this.state.onSaveParticipant }
                    />
            </div>);
    }
}

render(<AdminDashboard />, document.getElementById('app'));
