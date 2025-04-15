import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  appTitle = 'VideoEngine';
  appVersion = '1.0.0';
  
  constructor() { }

  ngOnInit() {
    console.log('Dashboard initialized');
  }
}
