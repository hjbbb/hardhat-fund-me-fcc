const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const {
    deployments,
    ethers,
    getNamedAccounts,
    getDefaultProvider,
    network,
} = require("hardhat")
const { assert, expect } = require("chai")
const { Contract } = require("ethers")
const { developmentChains } = require("../../helper-hardhat-config")

// yarn hardhat test
// yarn hardhat test --grep "amount funded"
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          // const sendValue = "1000000000000000000"
          const sendValue = ethers.parseEther("1")
          async function deployFundMeFixture() {
              // deploy our fundMe contract
              // using Hardhat-deploy

              // Or
              // const accounts = await ethers.getSigners()
              // const accountZero = accounts[0]
              const { deployer } = await getNamedAccounts()
              await deployments.fixture(["all"])
              // get the latest deployed contract
              const fundMe = await ethers.getContract("FundMe", deployer)
              return { fundMe, deployer }
          }

          describe("constructor", async function () {
              it("sets the aggregator addresses correctly", async function () {
                  const { fundMe, deployer } =
                      await loadFixture(deployFundMeFixture)
                  const response = await fundMe.getPriceFeed()
                  const mockV3Aggregator = await ethers.getContract(
                      "MockV3Aggregator",
                      deployer,
                  )
                  assert.equal(response, await mockV3Aggregator.getAddress())
              })
          })

          describe("fund", async function () {
              it("Fail if you don't send enough ETH", async function () {
                  const { fundMe } = await loadFixture(deployFundMeFixture)
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!",
                  )
              })
              it("updated the amount funded data structure", async function () {
                  const { fundMe, deployer } =
                      await loadFixture(deployFundMeFixture)
                  await fundMe.fund({ value: sendValue })
                  const response =
                      await fundMe.getAddressToAmountFunded(deployer)
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Add funder to array of funders", async function () {
                  const { fundMe, deployer } =
                      await loadFixture(deployFundMeFixture)
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })
          describe("withdraw", async function () {
              async function deployFundMeWithValueFixture() {
                  // deploy our fundMe contract
                  // using Hardhat-deploy

                  // Or
                  // const accounts = await ethers.getSigners()
                  // const accountZero = accounts[0]
                  const { fundMe, deployer } =
                      await loadFixture(deployFundMeFixture)
                  await fundMe.fund({ value: sendValue })
                  return { fundMe, deployer }
              }
              it("Withdraw ETH from a single founder", async function () {
                  const { fundMe, deployer } = await loadFixture(
                      deployFundMeWithValueFixture,
                  )
                  // Arrange
                  const startingFundMeBalance =
                      await fundMe.runner.provider.getBalance(
                          await fundMe.getAddress(),
                      )
                  const startingDeployerBalance =
                      await fundMe.runner.provider.getBalance(deployer)
                  // Act
                  const txResponse = await fundMe.withdraw()
                  const txReceipt = await txResponse.wait(1)

                  const { gasUsed, gasPrice } = txReceipt
                  const gasCost = gasUsed * gasPrice

                  const endingFundMeBalance =
                      await fundMe.runner.provider.getBalance(
                          await fundMe.getAddress(),
                      )
                  const endingDeployerBalance =
                      await fundMe.runner.provider.getBalance(deployer)
                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingDeployerBalance + startingFundMeBalance,
                      endingDeployerBalance + gasCost,
                  )
              })
              it("allow us to withdraw with multiple funders", async function () {
                  const { fundMe, deployer } = await loadFixture(
                      deployFundMeWithValueFixture,
                  )
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i],
                      )
                      fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.runner.provider.getBalance(
                          await fundMe.getAddress(),
                      )
                  const startingDeployerBalance =
                      await fundMe.runner.provider.getBalance(deployer)

                  // Act
                  const txResponse = await fundMe.withdraw()
                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, gasPrice } = txReceipt
                  const gasCost = gasUsed * gasPrice
                  // Assert
                  // Make sure that the funders are reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted
                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address,
                          ),
                          0,
                      )
                  }
              })

              it("Only allows the owner to withdraw", async function () {
                  const { fundMe } = await loadFixture(
                      deployFundMeWithValueFixture,
                  )
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract =
                      await fundMe.connect(attacker)
                  await expect(
                      attackerConnectedContract.withdraw(),
                  ).to.be.revertedWithCustomError(
                      attackerConnectedContract,
                      "FundMe__NotOwner",
                  )
              })

              it("cheaper withdraw testing", async function () {
                  const { fundMe, deployer } = await loadFixture(
                      deployFundMeWithValueFixture,
                  )
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i],
                      )
                      fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.runner.provider.getBalance(
                          await fundMe.getAddress(),
                      )
                  const startingDeployerBalance =
                      await fundMe.runner.provider.getBalance(deployer)

                  // Act
                  const txResponse = await fundMe.cheaperWithdraw()
                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, gasPrice } = txReceipt
                  const gasCost = gasUsed * gasPrice
                  // Assert
                  // Make sure that the funders are reset properly
                  await expect(fundMe.getFunder(0)).to.be.reverted
                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address,
                          ),
                          0,
                      )
                  }
              })
              it("cheaperWithdraw ETH from a single founder", async function () {
                  const { fundMe, deployer } = await loadFixture(
                      deployFundMeWithValueFixture,
                  )
                  // Arrange
                  const startingFundMeBalance =
                      await fundMe.runner.provider.getBalance(
                          await fundMe.getAddress(),
                      )
                  const startingDeployerBalance =
                      await fundMe.runner.provider.getBalance(deployer)
                  // Act
                  const txResponse = await fundMe.cheaperWithdraw()
                  const txReceipt = await txResponse.wait(1)

                  const { gasUsed, gasPrice } = txReceipt
                  const gasCost = gasUsed * gasPrice

                  const endingFundMeBalance =
                      await fundMe.runner.provider.getBalance(
                          await fundMe.getAddress(),
                      )
                  const endingDeployerBalance =
                      await fundMe.runner.provider.getBalance(deployer)
                  // Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingDeployerBalance + startingFundMeBalance,
                      endingDeployerBalance + gasCost,
                  )
              })
          })
      })
