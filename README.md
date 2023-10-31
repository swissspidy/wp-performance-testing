# WordPress Performance Testing Example

Example repository demonstrating how to set up performance testing in a WordPress project.

## Overview

Read the introduction blog post to learn more about this setup.

In short, running `npm run wp-env start` and `npm run test:performance` is all that's needed for performance testing.
After running tests, you will get a nicely formatted output such as this:

**Performance Test Results**

**Frontend Tests**

| wpLoadAlloptionsQuery | wpDbQueries | wpMemoryUsage | wpBeforeTemplate | wpTemplate | wpTotal | largestContentfulPaint | timeToFirstByte | lcpMinusTtfb |
| --------------------- | ----------- | ------------- | ---------------- | ---------- | ------- | ---------------------- | --------------- | ------------ |
|               0.96 ms |          26 |       3.75 MB |         26.70 ms |   12.89 ms | 41.36 ms |              125.95 ms |        48.55 ms |     76.55 ms |

### Sharding

By default, performance tests are run in sequence in order to not skew results with multiple simultaneous requests.

However, on Continuous Integration platforms like GitHub Actions it might be desired to run them in parallel on multiple machines.
In Playwright, this mode of operation is called [sharding](https://playwright.dev/docs/test-sharding).

To shard the test suite, pass `--shard=x/y` to the command line. For example, to split the suite into four shards, each running one fourth of the tests:

```
npm run test:performance -- --shard=1/4
npm run test:performance -- --shard=2/4
npm run test:performance -- --shard=3/4
npm run test:performance -- --shard=4/4
```

In this example, each test shard has its own test report. To have a combined report showing all the test results from all the shards, you can merge them.

```
npm run test:performance -- --shard=1/4 --reporter=blob
npm run test:performance -- --shard=2/4 --reporter=blob
npm run test:performance -- --shard=3/4 --reporter=blob
npm run test:performance -- --shard=4/4 --reporter=blob

npm run test:performance:merge-results
```

The blob reporter is the special glue that collects all test information in a special format so that they can be later merged.

`npm run test:performance:merge-results` then reads all blob reports and merges them into a single report.

#### GitHub Actions example

GitHub Actions supports [sharding tests between multiple jobs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs) using the [`jobs.<job_id>.strategy.matrix`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix) option.
The matrix option will run a separate job for every possible combination of the provided options.

```yaml
# .github/workflows/playwright.yml

name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  playwright-tests:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
    - uses: actions/checkout@v3

    - uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    
    - name: Start WordPres
      run: npm run wp-env start
    
    - name: Run Playwright tests
      run: npx playwright test --shard ${{ matrix.shard }}
    
    - name: Upload blob report to GitHub Actions Artifacts
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: all-blob-reports
        path: blob-report
        retention-days: 1

  merge-reports:
    # Merge reports after playwright-tests, even if some shards have failed
    if: always()
    needs: [playwright-tests]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: npm ci
    
    - name: Download blob reports from GitHub Actions Artifacts
      uses: actions/download-artifact@v3
      with:
        name: all-blob-reports
        path: all-blob-reports
    
    - name: Merge into single performance report
      run: npm run test:performance:merge-reports
    
    - name: Upload performance report
      uses: actions/upload-artifact@v3
      with:
        name: performance-report-${{ github.run_attempt }}
        path: artifacts/performance-results.json
        retention-days: 14
```

You can now see the reports have been merged and a combined performance report is available in the GitHub Actions Artifacts tab.

![image](https://github.com/swissspidy/wp-performance-testing/assets/841956/f8bfde82-d130-481e-b35c-ad519dd5208e)
